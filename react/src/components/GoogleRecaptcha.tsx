import { useEffect, useRef, useState } from "react";

let scriptPromise: Promise<void> | undefined;
function loadScript() {
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const w = window as any;
    if (w.grecaptcha?.render) { resolve(); return; }
    w.gradeupRecaptchaReady = resolve;
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=gradeupRecaptchaReady&render=explicit";
    script.async = true;
    script.onerror = () => { script.remove(); scriptPromise = undefined; reject(new Error("Unable to load Google reCAPTCHA. Check your connection and retry.")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleRecaptcha({ onChange, resetKey = 0 }: { onChange: (token: string) => void; resetKey?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [error, setError] = useState("");
  const sitekey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  useEffect(() => {
    let disposed = false;
    callback.current("");
    if (!sitekey) { setError("Security verification is not configured. Please contact support."); return; }
    setError("");
    const host = document.createElement("div");
    container.current?.appendChild(host);
    loadScript().then(() => {
      if (disposed) return;
      (window as any).grecaptcha.render(host, {
        sitekey,
        callback: (token: string) => { if (!disposed) callback.current(token); },
        "expired-callback": () => { if (!disposed) callback.current(""); },
        "error-callback": () => { if (!disposed) { callback.current(""); setError("Verification failed. Reload the page to retry."); } },
      });
    }).catch(e => { if (!disposed) setError(e.message); });
    return () => { disposed = true; host.remove(); };
  }, [sitekey, resetKey]);
  return <div><div ref={container} />{error && <p role="alert">{error}</p>}</div>;
}
