import { useToast } from "./use-toast";
import { requestLivekitToken } from "../lib/livekitToken";
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

interface UseSeminarLivekitOptions {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  enabled: boolean;
  role: "host" | "observer";
  localStream: MediaStream | null;
  apiBase: string;
  startMuted?: boolean;
}

interface UseSeminarLivekitReturn {
  connected: boolean;
  error: string | null;
  isMuted: boolean;
  muteLocalAudio: () => void;
  unmuteLocalAudio: () => void;
  disconnect: () => void;
}

export function useSeminarLivekit({
  sessionId,
  candidateId,
  candidateName,
  enabled,
  role,
  localStream,
  startMuted = true,
}: UseSeminarLivekitOptions): UseSeminarLivekitReturn {
  const { toast } = useToast();
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(startMuted);

  const muteLocalAudio = useCallback(() => {
    roomRef.current?.localParticipant?.setMicrophoneEnabled(false);
    setIsMuted(true);
  }, []);

  const unmuteLocalAudio = useCallback(() => {
    roomRef.current?.localParticipant?.setMicrophoneEnabled(true);
    setIsMuted(false);
  }, []);

  const cleanupAudioElements = useCallback(() => {
    audioElementsRef.current.forEach((el) => {
      try { el.pause(); el.srcObject = null; el.remove(); } catch {}
    });
    audioElementsRef.current = [];
  }, []);

  const disconnect = useCallback(() => {
    cleanupAudioElements();
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
  }, [cleanupAudioElements]);

  useEffect(() => {
    if (!enabled || !sessionId || !candidateId) return;

    let cancelled = false;
    const abortController = new AbortController();
    setError(null);

    async function connect() {
      try {
        const connection = await requestLivekitToken(
          "/api/v1/seminar/livekit-token",
          { sessionId, candidateId, candidateName, role },
          abortController.signal,
        );
        if (cancelled) return;

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              const audioEl = track.attach();
              audioEl.style.display = "none";
              audioEl.autoplay = true;
              document.body.appendChild(audioEl);
              audioElementsRef.current.push(audioEl);
            }
          }
        );

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            const detached = track.detach();
            detached.forEach((el) => {
              el.remove();
              audioElementsRef.current = audioElementsRef.current.filter((a) => a !== el);
            });
          }
        });

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (state === ConnectionState.Connected) setConnected(true);
          if (state === ConnectionState.Disconnected) {
            setConnected(false);
          }
        });

        await room.connect(connection.livekitUrl, connection.token, { autoSubscribe: true });

        if (!cancelled && localStream) {
          const audioTrack = localStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = !startMuted;
            const livekitTrack = new LocalAudioTrack(audioTrack, undefined, false);
            await room.localParticipant.publishTrack(livekitTrack);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ title: "Unable to join live room", description: err?.message || "Please try again.", variant: "destructive" });
          console.warn("[SEMINAR-LIVEKIT] connection failed:", err?.message);
          setError(err?.message || "Livekit connection failed");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      abortController.abort();
      cleanupAudioElements();
      roomRef.current?.disconnect();
      roomRef.current = null;
      setConnected(false);
    };
  }, [enabled, sessionId, candidateId, role, localStream]);

  return { connected, error, isMuted, muteLocalAudio, unmuteLocalAudio, disconnect };
}
