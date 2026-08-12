/**
 * Realtime Audio Service
 * Manages WebRTC connections to OpenAI's Realtime API for streaming speech
 */

export interface RealtimeSession {
  sessionId?: string;
  clientSecret: string;
  expiresAt?: string | number;
}

export interface RTCConnectionState {
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  audioStream: MediaStream | null;
  isConnected: boolean;
  audioElement: HTMLAudioElement | null;
}

type AudioCallback = () => void;
type ErrorCallback = (error: Error) => void;

export class RealtimeAudioService {
  private session: RealtimeSession | null = null;
  private connectionState: RTCConnectionState = {
    peerConnection: null,
    dataChannel: null,
    audioStream: null,
    isConnected: false,
    audioElement: null,
  };

  private onAudioStartCallback: AudioCallback | null = null;
  private onAudioEndCallback: AudioCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private isResponseActive: boolean = false;
  private currentResponseId: string | null = null;
  private hasAudioStarted: boolean = false;

  /**
   * Initialize session with token data from backend
   */
async initializeSession(sessionData: RealtimeSession): Promise<void> {
    if (!sessionData.clientSecret) {
      console.log("Invalid session data received:", sessionData);
      throw new Error("Invalid session data: missing clientSecret");
    }
    // Generate a local session ID if not provided by API
    this.session = {
      ...sessionData,
      sessionId: sessionData.sessionId || `session-${Date.now()}`,
    };
    console.log("Realtime session initialized:", this.session.sessionId);
  }

  /**
   * Establish WebRTC connection and data channel
   */
  async establishConnection(): Promise<void> {
    if (!this.session) {
      throw new Error("Session not initialized. Call initializeSession first.");
    }

    if (this.connectionState.isConnected) {
      console.log("Connection already established, reusing...");
      return;
    }

    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302"] },
          { urls: ["stun:stun1.l.google.com:19302"] },
        ],
      });

      this.connectionState.peerConnection = peerConnection;

      // Create audio element for playback and ADD TO DOM
      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.controls = false;
      audioElement.playsInline = true; // iOS support: allow inline playback without full screen
      audioElement.setAttribute('webkit-playsinline', 'true'); // Legacy iOS support
      audioElement.style.display = 'none'; // Hide it but keep it in DOM
      audioElement.style.pointerEvents = 'none'; // Prevent accidental interactions
      document.body.appendChild(audioElement); // CRITICAL: Must be in DOM for audio to play
      this.connectionState.audioElement = audioElement;
      console.log("🔊 Audio element created and attached to DOM with autoplay enabled");


      // Handle incoming audio track
      peerConnection.ontrack = (event) => {
        console.log("🎵 Received remote audio track from realtime API, attaching to element...");
        
        // Get the current audio element (which may have been refreshed by cancel())
        const audioElement = this.connectionState.audioElement;
        if (!audioElement) {
          console.error("❌ Audio element not available for track attachment");
          return;
        }
        
        if (audioElement.srcObject && audioElement.srcObject !== event.streams[0]) {
          console.warn("⚠️ Audio stream already set, replacing...");
        }
        
        // Attach stream to audio element for playback
        audioElement.srcObject = event.streams[0];
        
        // IMPORTANT: Remove old onended handler (if any) before adding new one
        // This prevents duplicate handlers if ontrack is called multiple times
        audioElement.onended = null;
        
        // Listen for audio end on the element itself (fallback detection)
        audioElement.onended = () => {
          console.log("🎵 Audio element ended event fired - audio playback complete");
          // Only trigger callback if this response is still being tracked
          if (this.hasAudioStarted) {
            this.hasAudioStarted = false;
            this.currentResponseId = null;
            this.isResponseActive = false;
            console.log("✅ Triggering onAudioEndCallback from audio element end");
            this.onAudioEndCallback?.();
          }
        };
        
        // Try to play (may be blocked by autoplay policy)
        const playPromise = audioElement.play();
        if (playPromise) {
          playPromise
            .then(() => {
              console.log("✅ Audio element started playing");
              this.hasAudioStarted = true;  // ← TRACK THAT AUDIO ACTUALLY STARTED
              this.onAudioStartCallback?.();
            })
            .catch((error) => {
              console.error("❌ Audio autoplay failed (may be blocked by policy):", error);
              // Still call callback even if autoplay fails - user may have gesture
              this.hasAudioStarted = true;  // ← STILL MARK AS STARTED
              this.onAudioStartCallback?.();
            });
        } else {
          // Fallback for older browsers
          this.hasAudioStarted = true;  // ← MARK AS STARTED
          this.onAudioStartCallback?.();
        }
      };

      // Setup ICE candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.debug("ICE candidate generated");
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(
          "Peer connection state:",
          peerConnection.connectionState
        );
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          this.onErrorCallback?.(
            new Error(
              `Peer connection ${peerConnection.connectionState}`
            )
          );
        }
      };

      // Listen for data channels created by remote peer (OpenAI server)
      peerConnection.ondatachannel = (event) => {
        console.log("📨 Received data channel from remote peer:", event.channel.label);
        // If we got a channel from the remote side, use it instead
        this.setupDataChannel(event.channel);
      };

      // CREATE DATA CHANNEL FIRST (before creating offer!)
      // This ensures it's included in the offer SDP
      console.log("📡 Creating data channel for events...");
      const dc = peerConnection.createDataChannel("oai-events", {
        ordered: true,
      });
      this.setupDataChannel(dc);

      // NOW create offer (will include the data channel we just created)
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
      });

      await peerConnection.setLocalDescription(offer);

      // Exchange SDP via backend proxy (required by GA API)
      console.log("🔌 Initiating SDP exchange via backend...");
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/realtime/sdp`,  // Backend endpoint, NOT OpenAI directly
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            "x-ephemeral-token": this.session.clientSecret, // Pass token to backend
          },
          body: offer.sdp,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SDP exchange failed (${response.status}): ${errorText}`
        );
      }

      const answerSdp = await response.text();
      console.log("✅ SDP exchange successful");

      // Set remote description with received answer
      const answer = new RTCSessionDescription({
        type: "answer",
        sdp: answerSdp,
      });

      await peerConnection.setRemoteDescription(answer);

      console.log("🔄 Remote description set, data channel should open...");

      // Wait for data channel to open
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL FIX: Ensure audio element is playing
      if (this.connectionState.audioElement && this.connectionState.audioElement.srcObject) {
        try {
          const playPromise = this.connectionState.audioElement.play();
          if (playPromise) {
            await playPromise;
            console.log("🎵 Audio element confirmed playing after connection");
          }
        } catch (error) {
          console.warn("⚠️ Could not auto-play audio (may need user gesture):", error);
        }
      }

      this.connectionState.isConnected = true;
      console.log("✅ WebRTC connection established successfully");

    } catch (error) {
      const err = error instanceof Error
        ? error
        : new Error(String(error));
      console.error("Failed to establish WebRTC connection:", err);
      this.cleanup();
      this.onErrorCallback?.(err);
      throw err;
    }
  }

  /**
   * Setup data channel communication
   */
  private setupDataChannel(dc: RTCDataChannel): void {
    // Set reference immediately (even before open)
    this.connectionState.dataChannel = dc;
    
    console.log("📡 Data channel created, readyState:", dc.readyState);

    dc.onopen = () => {
      console.log("✅ Data channel opened!");
    };

    dc.onclose = () => {
      console.log("📡 Data channel closed");
      this.connectionState.dataChannel = null;
      this.onAudioEndCallback?.();
    };

    dc.onerror = (event) => {
      const errorMsg =
        (event as RTCErrorEvent).error?.message || "Unknown error";
      const error = new Error(`Data channel error: ${errorMsg}`);
      console.error("❌ Data channel error:", error);
      this.onErrorCallback?.(error);
    };

    dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleRealtimeMessage(message);
      } catch (e) {
        console.error("Failed to parse realtime message:", e);
      }
    };
  }

  /**
   * Handle incoming messages from OpenAI Realtime API
   */
private handleRealtimeMessage(message: any): void {
    const eventType = message.type;

    switch (eventType) {
      case "response.created":
        // API confirmed the response - track it
        if (message.response?.id) {
          this.currentResponseId = message.response.id;
          console.log(`📨 Response created with ID: ${this.currentResponseId}`);
        }
        break;
      case "response.audio_transcript.done":
        console.log("📝 Audio transcript complete");
        break;
      case "response.audio.done":
        console.log("🎵 Response audio generation complete");
        break;
      case "response.done":
        // NOTE: response.done = API finished generating response, NOT audio finished playing
        // Do NOT trigger onAudioEndCallback here - it fires too early
        // Instead, rely on audioElement.onended event which fires when audio actually finishes
        console.log(`📨 Response ${this.currentResponseId} generation complete (but audio still playing)`);
        // Mark response as complete but don't trigger cleanup yet
        this.isResponseActive = false;
        break;
 case "error":
        console.error("❌ Realtime API error:", message.error);
        // Only treat as fatal if no audio response is in progress
        // Non-fatal errors (e.g. invalid_request_error on old messages) should not trigger fallback
        if (message.error?.type !== "invalid_request_error") {
          this.onErrorCallback?.(
            new Error(message.error?.message || "Unknown API error")
          );
        } else {
          console.warn("⚠️ Non-fatal API error ignored (audio may still play):", message.error?.message);
        }
        break;
      default:
        // Log unknown events for debugging
        if (eventType) {
          console.debug("📨 Realtime event:", eventType);
        }
        break;
    }
  }

  /**
   * Send text to realtime API for audio generation
   * Note: OpenAI Realtime API expects audio input; text input support varies
   * Current implementation demonstrates the structure - may need adjustment
   * based on actual OpenAI Realtime API text input support
   */
  sendText(text: string): void {
    if (!this.connectionState.dataChannel) {
      throw new Error("Data channel not available");
    }
console.log(this.connectionState.dataChannel.readyState)
    if (this.connectionState.dataChannel.readyState !== "open") {
      throw new Error(
        `Data channel not open (state: ${this.connectionState.dataChannel.readyState})`
      );
    }

    try {
      this.isResponseActive = true;
      // Generate unique response ID for this request
      this.currentResponseId = `response-${Date.now()}-${Math.random()}`;
      const responseId = this.currentResponseId;
      console.log(`📤 Creating response with ID: ${responseId}`);
      
      // REMOVED: Don't try to resume. Let the new audio stream from the API 
      // control playback automatically via the ontrack handler.
      // This prevents interference with the incoming stream.
      
      // Send the text with explicit instruction to read it exactly
      const message = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Read the following text out loud exactly as written, word for word, do not add anything else:\n\n${text}`,
            },
          ],
        },
      };

      this.connectionState.dataChannel.send(JSON.stringify(message));

      // Trigger audio response
      const responseMessage = {
        type: "response.create",
      };

      this.connectionState.dataChannel.send(
        JSON.stringify(responseMessage)
      );

      console.log(
        "Sent text to realtime API:",
        text.substring(0, 50) + (text.length > 50 ? "..." : "")
      );

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to send text:", err);
      this.onErrorCallback?.(err);
      throw err;
    }
  }

  /**
   * Immediately stop audio playback and cancel active response
   */
  cancel(): void {
    // Clear the current response ID so old response.done events won't trigger callbacks
    this.currentResponseId = null;
    this.hasAudioStarted = false;  // ← RESET FLAG
    
    // IMMEDIATELY stop the audio element — don't wait for API
    if (this.connectionState.audioElement) {
      this.connectionState.audioElement.pause();
      this.connectionState.audioElement.currentTime = 0;
      this.connectionState.audioElement.srcObject = null;
      
      // CRITICAL: Remove and recreate audio element to reset its internal state completely
      // This ensures that when we attach a new stream via ontrack, the element is fresh
      // and play() will succeed without state conflicts
      if (this.connectionState.audioElement.parentElement) {
        this.connectionState.audioElement.parentElement.removeChild(
          this.connectionState.audioElement
        );
      }
      
      // Create fresh audio element for next playback
      const newAudioElement = new Audio();
      newAudioElement.autoplay = true;
      newAudioElement.controls = false;
      newAudioElement.playsInline = true;
      newAudioElement.setAttribute('webkit-playsinline', 'true');
      newAudioElement.style.display = 'none';
      newAudioElement.style.pointerEvents = 'none';
      document.body.appendChild(newAudioElement);
      this.connectionState.audioElement = newAudioElement;
      
      console.log("🔇 Audio element stopped, cleared, response cancelled, and reset with fresh instance");
    }

    // Then tell API to cancel if a response is active
    if (
      !this.connectionState.dataChannel ||
      this.connectionState.dataChannel.readyState !== "open"
    ) {
      // Connection already broken, reset state
      this.connectionState.isConnected = false;
      this.connectionState.peerConnection = null;
      this.connectionState.dataChannel = null;
      return;
    }

    try {
      if (!this.isResponseActive) {
        console.log("No active response to cancel, skipping");
        // Still reset connection for next play
        this.connectionState.isConnected = false;
        this.connectionState.peerConnection = null;
        this.connectionState.dataChannel = null;
        return;
      }
      this.isResponseActive = false;
      const message = {
        type: "response.cancel",
      };
      this.connectionState.dataChannel.send(JSON.stringify(message));
      console.log("Sent cancel message to realtime API");
      
      // Reset connection state so next play will re-establish fresh connection
      // This prevents reusing a potentially corrupted connection
      this.connectionState.isConnected = false;
      this.connectionState.peerConnection = null;
      this.connectionState.dataChannel = null;
      
    } catch (error) {
      console.error("Failed to send cancel message:", error);
      // Reset connection on error too
      this.connectionState.isConnected = false;
      this.connectionState.peerConnection = null;
      this.connectionState.dataChannel = null;
    }
  }

  /**
   * Close WebRTC connection and cleanup resources
   */
  cleanup(): void {
    try {
      // Close data channel
      if (this.connectionState.dataChannel) {
        this.connectionState.dataChannel.close();
        this.connectionState.dataChannel = null;
      }

      // Stop all audio tracks and close peer connection
      if (this.connectionState.peerConnection) {
        this.connectionState.peerConnection.getSenders().forEach((sender) => {
          try {
            sender.track?.stop();
          } catch (e) {
            console.error("Error stopping sender track:", e);
          }
        });

        this.connectionState.peerConnection.getReceivers().forEach((receiver) => {
          try {
            receiver.track?.stop();
          } catch (e) {
            console.error("Error stopping receiver track:", e);
          }
        });

        this.connectionState.peerConnection.close();
        this.connectionState.peerConnection = null;
      }

      // Stop media stream tracks
      if (this.connectionState.audioStream) {
        this.connectionState.audioStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.connectionState.audioStream = null;
      }

      // Clear audio element
      if (this.connectionState.audioElement) {
        this.connectionState.audioElement.pause();
        this.connectionState.audioElement.srcObject = null;
        // Remove from DOM
        if (this.connectionState.audioElement.parentElement) {
          this.connectionState.audioElement.parentElement.removeChild(
            this.connectionState.audioElement
          );
        }
        this.connectionState.audioElement = null;
      }

      this.connectionState.isConnected = false;
      console.log("WebRTC connection cleaned up");

    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Register callback for when audio starts playing
   */
  onAudioStart(callback: AudioCallback): void {
    this.onAudioStartCallback = callback;
  }

  /**
   * Register callback for when audio ends
   */
  onAudioEnd(callback: AudioCallback): void {
    this.onAudioEndCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Wait for data channel to open with polling
   */
  async waitForDataChannelOpen(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    console.log("⏳ Waiting for data channel to open...");
    
    while (Date.now() - startTime < timeoutMs) {
      const dc = this.connectionState.dataChannel;
      const state = dc?.readyState;
      
      console.log("📡 Data channel state:", state);
      
      if (state === "open") {
        console.log("✅ Data channel is open!");
        return;
      }
      
      if (state === "closed" || state === "closing") {
        throw new Error(`Data channel ${state}`);
      }
      
      if (!dc) {
        console.warn("⚠️ Data channel reference missing");
        throw new Error("Data channel not created");
      }
      
      // Wait 200ms before checking again (increased from 100ms)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    throw new Error(
      `Data channel did not open within ${timeoutMs}ms. Final state: ${this.connectionState.dataChannel?.readyState}`
    );
  }

  /**
   * Get current connection state for debugging
   */
  getState() {
    return {
      isConnected: this.connectionState.isConnected,
      dataChannelReady:
        this.connectionState.dataChannel?.readyState === "open",
      peerConnectionState: this.connectionState.peerConnection?.connectionState,
      sessionId: this.session?.sessionId,
    };
  }
}

// Export singleton instance
export const realtimeAudioService = new RealtimeAudioService();