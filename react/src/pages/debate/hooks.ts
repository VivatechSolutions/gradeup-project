import { useState, useEffect, useRef, useCallback } from "react";

// ─── Timer ───────────────────────────────────────────────────────────────────
export function useTimer(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Mic only ────────────────────────────────────────────────────────────────
export function useMicPerm() {
  const [state, setState] = useState<"idle"|"requesting"|"granted"|"denied">("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  async function request() {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(s); setState("granted"); return s;
    } catch { setState("denied"); return null; }
  }

  function stop() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setState("idle");
  }

  return { state, stream, request, stop };
}

// ─── Camera + mic ────────────────────────────────────────────────────────────
export function useMediaPerm() {
  const [state, setState] = useState<"idle"|"requesting"|"granted"|"denied">("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  async function request() {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s); setState("granted"); return s;
    } catch { setState("denied"); return null; }
  }

  function stop() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setState("idle");
  }

  return { state, stream, request, stop };
}

// ─── Screen recorder ─────────────────────────────────────────────────────────
export function useRecorder() {
  const mrRef     = useRef<MediaRecorder | null>(null);
  const chunks    = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [blob, setBlob]               = useState<Blob | null>(null);

  async function start(audio?: MediaStream | null) {
    try {
      const ds = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: "browser" }, audio: true,
      });
      const tracks = [...ds.getTracks()];
      if (audio) audio.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
      const combined = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus" : "video/webm";
      const mr = new MediaRecorder(combined, { mimeType: mime });
      chunks.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        setBlob(new Blob(chunks.current, { type: mime }));
        combined.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      };
      ds.getVideoTracks()[0].addEventListener("ended", () => stop());
      mr.start(1000); mrRef.current = mr; setIsRecording(true); return true;
    } catch { return false; }
  }

  function stop() {
    if (mrRef.current?.state !== "inactive") mrRef.current?.stop();
    setIsRecording(false);
  }

  function download(fname = "debatearena.webm") {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = fname; a.click();
    URL.revokeObjectURL(u);
  }

  return { isRecording, blob, start, stop, download };
}

// ─── Screen share ────────────────────────────────────────────────────────────
export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    try {
      const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      s.getVideoTracks()[0].addEventListener("ended", () => stop());
      streamRef.current = s; setIsSharing(true); return true;
    } catch { return false; }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null; setIsSharing(false);
  }

  return { isSharing, start, stop };
}

// ─── AI Voice (TTS) ──────────────────────────────────────────────────────────
export function useAIVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pre-load voices
  useEffect(() => {
    function pickVoice() {
      const voices = window.speechSynthesis?.getVoices() || [];
      voiceRef.current =
        voices.find(v => v.name.includes("Google UK English Male")) ||
        voices.find(v => v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith("en") && !v.localService) ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0] || null;
    }
    pickVoice();
    window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!("speechSynthesis" in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onstart  = () => setIsSpeaking(true);
    u.onend    = () => { setIsSpeaking(false); onDone?.(); };
    u.onerror  = () => { setIsSpeaking(false); onDone?.(); };
    utterRef.current = u;
    // Small delay to ensure cancel() completes first
    setTimeout(() => window.speechSynthesis.speak(u), 80);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, cancel };
}

// ─── Silence detector ────────────────────────────────────────────────────────
export function useSilenceDetector(
  stream: MediaStream | null,
  enabled: boolean,
  onSilence: () => void,
  thresholdMs = 5000,
) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef     = useRef<number>(0);
  const ctxRef     = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !enabled) return;

    let ctx: AudioContext;
    try { ctx = new AudioContext(); } catch { return; }
    ctxRef.current = ctx;

    const src      = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    const data     = new Uint8Array(analyser.frequencyBinCount);
    let silentSince: number | null = null;

    function check() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;

      if (avg < 8) {
        if (!silentSince) silentSince = Date.now();
        else if (Date.now() - silentSince > thresholdMs) {
          silentSince = null; // reset
          onSilence();
        }
      } else {
        silentSince = null;
      }
      rafRef.current = requestAnimationFrame(check);
    }

    rafRef.current = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.close();
      ctxRef.current = null;
    };
  }, [stream, enabled]);
}

// ─── Loading state helper ────────────────────────────────────────────────────
export function useLoader(defaultMs = 2000) {
  const [loading, setLoading] = useState(false);
  function run(ms = defaultMs): Promise<void> {
    setLoading(true);
    return new Promise(res => setTimeout(() => { setLoading(false); res(); }, ms));
  }
  return { loading, run };
}