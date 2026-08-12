import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  ConnectionState,
  LocalAudioTrack,
} from "livekit-client";

interface UseDebateLivekitOptions {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  enabled: boolean;
  localStream: MediaStream | null;
  apiBase: string;
  startMuted?: boolean;
}

interface UseDebateLivekitReturn {
  connected: boolean;
  error: string | null;
  isScreenSharing: boolean;
  localScreenShareTrack: any | null;
  remoteScreenShareTrack: any | null;
  muteLocalAudio: () => void;
  unmuteLocalAudio: () => void;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => Promise<void>;
  disconnect: () => void;
}

export function useDebateLivekit({
  sessionId,
  candidateId,
  candidateName,
  enabled,
  localStream,
  apiBase,
  startMuted = true,
}: UseDebateLivekitOptions): UseDebateLivekitReturn {
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const localScreenShareTrackRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenShareTrack, setLocalScreenShareTrack] = useState<any | null>(null);
  const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<any | null>(null);

  const muteLocalAudio = useCallback(() => {
    roomRef.current?.localParticipant?.setMicrophoneEnabled(false);
    console.log("[LIVEKIT] local audio muted");
  }, []);

  const unmuteLocalAudio = useCallback(() => {
    // ✓ FIX 3A: Ensure local track is enabled too
    try {
      const audioTrack = localStream?.getAudioTracks?.()[0];
      if (audioTrack && !audioTrack.enabled) {
        audioTrack.enabled = true;
        console.log("[LIVEKIT] local audio track enabled", {
          trackId: audioTrack.id,
          readyState: audioTrack.readyState,
        });
      }
    } catch (err) {
      console.warn("[LIVEKIT] failed to enable local track", { error: err });
    }

    // ✓ FIX 3B: Also unmute LiveKit
    roomRef.current?.localParticipant?.setMicrophoneEnabled(true);
    console.log("[LIVEKIT] LiveKit microphone enabled");
  }, [localStream]);

  // Clean up all audio elements we created
  const cleanupAudioElements = useCallback(() => {
    audioElementsRef.current.forEach((el) => {
      try { el.pause(); el.srcObject = null; el.remove(); } catch {}
    });
    audioElementsRef.current = [];
    console.log("[LIVEKIT] audio elements cleaned up");
  }, []);

  const stopScreenShare = useCallback(async () => {
    try {
      await roomRef.current?.localParticipant?.setScreenShareEnabled(false);
    } catch (err) {
      console.warn("[LIVEKIT][SCREEN] failed to disable screen share", { sessionId, error: err });
    }
    try {
      localScreenShareTrackRef.current?.mediaStreamTrack?.stop?.();
      localScreenShareTrackRef.current?.stop?.();
    } catch {}
    localScreenShareTrackRef.current = null;
    setLocalScreenShareTrack(null);
    setIsScreenSharing(false);
    console.log("[LIVEKIT][SCREEN] local screen share stopped", { sessionId });
  }, [sessionId]);

  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !connected) {
      console.warn("[LIVEKIT][SCREEN] cannot start before room connection", { sessionId, connected });
      setError("LiveKit is not connected yet");
      return false;
    }

    try {
      console.log("[LIVEKIT][SCREEN] starting local screen share", { sessionId });
      const publication: any = await room.localParticipant.setScreenShareEnabled(true, {
        audio: false,
      });
      const track = Array.isArray(publication)
        ? publication.find((item: any) => item?.source === Track.Source.ScreenShare)?.track || publication[0]?.track
        : publication?.track || publication;

      localScreenShareTrackRef.current = track || null;
      setLocalScreenShareTrack(track || null);
      setIsScreenSharing(Boolean(track));

      const mediaTrack = track?.mediaStreamTrack;
      if (mediaTrack) {
        mediaTrack.onended = () => {
          console.log("[LIVEKIT][SCREEN] browser ended local screen share", { sessionId });
          stopScreenShare().catch(() => {});
        };
      }

      console.log("[LIVEKIT][SCREEN] local screen share published", {
        sessionId,
        trackSid: publication?.trackSid,
        source: publication?.source,
      });
      return Boolean(track);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "AbortError") {
        console.log("[LIVEKIT][SCREEN] screen share cancelled by user", { sessionId });
      } else {
        console.error("[LIVEKIT][SCREEN] failed to publish screen share", { sessionId, error: err?.message || err });
        setError(err?.message || "Screen share failed");
      }
      localScreenShareTrackRef.current = null;
      setLocalScreenShareTrack(null);
      setIsScreenSharing(false);
      return false;
    }
  }, [connected, sessionId, stopScreenShare]);

  const disconnect = useCallback(() => {
    cleanupAudioElements();
    stopScreenShare().catch(() => {});
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
    console.log("[LIVEKIT] disconnected");
  }, [cleanupAudioElements, stopScreenShare]);

  useEffect(() => {
  // localStream can be null for listen-only participants — still allow connection
    if (!enabled || !sessionId || !candidateId) return;

    let cancelled = false;

    async function connect() {
      try {
        console.log("[LIVEKIT] fetching token", { sessionId, candidateId });
        const response = await fetch(`${apiBase}/api/v1/debate/room/livekit-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, candidateId, candidateName }),
        });
        const data = await response.json();
        if (!data?.data?.token) {
          throw new Error("Failed to get Livekit token");
        }
        if (cancelled) return;
        console.log("[LIVEKIT] token received, connecting to room", {
          sessionId,
          livekitUrl: data.data.livekitUrl,
        });

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              console.log("[LIVEKIT] remote audio track subscribed", {
                participantId: participant.identity,
                participantName: participant.name,
              });
              const audioEl = track.attach();
              audioEl.style.display = "none";
              audioEl.autoplay = true;
              document.body.appendChild(audioEl);
              // Track so we can clean up on disconnect
              audioElementsRef.current.push(audioEl);
            }
            const source = _pub?.source || (track as any)?.source;
            if (track.kind === Track.Kind.Video && source === Track.Source.ScreenShare) {
              console.log("[LIVEKIT][SCREEN] remote screen share subscribed", {
                participantId: participant.identity,
                participantName: participant.name,
                trackSid: _pub?.trackSid,
                source,
              });
              setRemoteScreenShareTrack(track);
            }
          }
        );

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub?: RemoteTrackPublication, participant?: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const detached = track.detach();
            detached.forEach((el) => {
              el.remove();
              audioElementsRef.current = audioElementsRef.current.filter((a) => a !== el);
            });
            console.log("[LIVEKIT] remote audio track unsubscribed and removed");
          }
          const source = pub?.source || (track as any)?.source;
          if (track.kind === Track.Kind.Video && source === Track.Source.ScreenShare) {
            track.detach().forEach((el) => el.remove());
            setRemoteScreenShareTrack((current) => (current === track ? null : current));
            console.log("[LIVEKIT][SCREEN] remote screen share unsubscribed", {
              participantId: participant?.identity,
              trackSid: pub?.trackSid,
              source,
            });
          }
        });

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log("[LIVEKIT] connection state changed", { state, sessionId });
          if (state === ConnectionState.Connected) setConnected(true);
          if (state === ConnectionState.Disconnected || state === ConnectionState.Failed) {
            setConnected(false);
          }
        });

        await room.connect(data.data.livekitUrl, data.data.token, {
          autoSubscribe: true,
        });

        if (!cancelled) {
          // Publish caller's existing audio track if available (host only).
          // Participants pass localStream=null and skip publishing entirely.
          const audioTrack = localStream ? localStream.getAudioTracks()[0] : null;
          if (audioTrack) {
            console.log("[LIVEKIT] publishing existing localStream track", {
              sessionId,
              trackId: audioTrack.id,
              readyState: audioTrack.readyState,
              enabled: audioTrack.enabled,
              startMuted,
            });
            // Set initial muted state BEFORE publishing
            audioTrack.enabled = !startMuted;
            const livekitTrack = new LocalAudioTrack(audioTrack, undefined, false);
            await room.localParticipant.publishTrack(livekitTrack);
            console.log("[LIVEKIT] track published, startMuted =", startMuted);
            
            // Monitor audio track state to ensure mic indicator persists
            audioTrack.onmute = () => {
              console.log("[LIVEKIT] audio track muted by browser/OS", { sessionId });
            };
            audioTrack.onunmute = () => {
              console.log("[LIVEKIT] audio track unmuted by browser/OS", { sessionId });
            };
            audioTrack.onended = () => {
              console.log("[LIVEKIT] audio track ended", { sessionId });
            };
            
            // Log final audio track state after publishing
            setTimeout(() => {
              console.log("[LIVEKIT] audio track state 200ms post-publish", {
                sessionId,
                trackId: audioTrack.id,
                enabled: audioTrack.enabled,
                readyState: audioTrack.readyState,
              });
            }, 200);
          } else {
            console.warn("[LIVEKIT] no audio track found in localStream", { sessionId });
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[LIVEKIT] connection failed", { sessionId, error: err?.message });
          setError(err?.message || "Livekit connection failed");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      cleanupAudioElements();
      stopScreenShare().catch(() => {});
      setRemoteScreenShareTrack(null);
      roomRef.current?.disconnect();
      roomRef.current = null;
      setConnected(false);
      console.log("[LIVEKIT] effect cleanup — disconnected", { sessionId });
    };
  }, [enabled, sessionId, candidateId, localStream, cleanupAudioElements, stopScreenShare]);

  return {
    connected,
    error,
    isScreenSharing,
    localScreenShareTrack,
    remoteScreenShareTrack,
    muteLocalAudio,
    unmuteLocalAudio,
    startScreenShare,
    stopScreenShare,
    disconnect,
  };
}
