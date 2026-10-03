export const DICTATION_SILENCE_MS = 5000;

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: null | (() => void);
  onspeechstart: null | (() => void);
  onspeechend: null | (() => void);
  onresult: null | ((event: any) => void);
  onerror: null | ((event: any) => void);
  onend: null | (() => void);
};

/** Keep one dictation session alive across the browser's shorter recognition runs. */
export function createVoiceDictation(
  recognition: Recognition,
  onText: (text: string) => void,
  onListening: (listening: boolean) => void,
  onError: (error: string) => void,
) {
  let active = false;
  let finishing = false;
  let disposed = false;
  let speaking = false;
  let prefix = "";
  let committed = "";
  let runText = "";
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  const join = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(" ");
  const publish = () => onText(join(prefix, committed, runText));
  const clearTimers = () => {
    clearTimeout(silenceTimer);
    clearTimeout(restartTimer);
    silenceTimer = undefined;
    restartTimer = undefined;
  };
  const stop = () => {
    if (!active) return;
    active = false;
    finishing = true;
    clearTimers();
    onListening(false);
    recognition.stop();
  };
  const armSilence = () => {
    clearTimeout(silenceTimer);
    if (active) silenceTimer = setTimeout(stop, DICTATION_SILENCE_MS);
  };
  const startRun = () => {
    if (!active || disposed) return;
    try { recognition.start(); }
    catch {
      active = false;
      clearTimers();
      onListening(false);
      onError("Unable to start speech recognition. Please try again.");
    }
  };
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => { if (active && !disposed) onListening(true); };
  recognition.onspeechstart = () => {
    if (!active) return;
    speaking = true;
    clearTimeout(silenceTimer);
    silenceTimer = undefined;
  };
  recognition.onspeechend = () => { speaking = false; armSilence(); };
  recognition.onresult = (event) => {
    if (disposed || (!active && !finishing)) return;
    // Results contain the complete current run, including revised interim text.
    runText = Array.from(event.results as ArrayLike<any>)
      .map((result: any) => result[0]?.transcript || "").join(" ");
    publish();
    if (!speaking) armSilence();
  };
  recognition.onerror = (event) => {
    if (!active || disposed) return;
    // Browser silence is recoverable; onend restarts until our silence timer expires.
    if (event.error === "no-speech") return;
    active = false;
    finishing = false;
    clearTimers();
    onListening(false);
    onError(`Speech recognition error: ${event.error}. Please try again.`);
  };
  recognition.onend = () => {
    if (disposed) return;
    committed = join(committed, runText);
    runText = "";
    speaking = false;
    finishing = false;
    if (active) {
      // Do not extend an existing deadline simply because the browser ended early.
      if (!silenceTimer) armSilence();
      restartTimer = setTimeout(startRun, 100);
    }
  };
  const cancel = () => {
    active = false;
    finishing = false;
    clearTimers();
    recognition.abort();
    onListening(false);
  };
  return {
    start(text = "") {
      if (active || disposed || finishing) return;
      prefix = text;
      committed = "";
      runText = "";
      speaking = false;
      active = true;
      armSilence();
      startRun();
    },
    stop,
    cancel,
    dispose() {
      disposed = true;
      active = false;
      clearTimers();
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.onspeechstart = recognition.onspeechend = null;
      recognition.abort();
    },
  };
}
