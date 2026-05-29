import React, { useEffect, useRef } from 'react';

interface SoundDetectorProps {
  stream: MediaStream | null;
  onSound: () => void;
}

const SoundDetector: React.FC<SoundDetectorProps> = ({ stream, onSound }) => {
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (stream) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);
      source.current = audioContext.current.createMediaStreamSource(stream);
      source.current.connect(analyser.current);
      requestRef.current = requestAnimationFrame(checkSound);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (source.current) {
        source.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stream]);

  const checkSound = () => {
    if (analyser.current && dataArray.current) {
      analyser.current.getByteFrequencyData(dataArray.current);
      let sum = 0;
      for (const amplitude of dataArray.current) {
        sum += amplitude * amplitude;
      }
      const volume = Math.sqrt(sum / dataArray.current.length);
      if (volume > 30) { // Threshold for sound detection
        onSound();
      }
    }
    requestRef.current = requestAnimationFrame(checkSound);
  };

  return null;
};

export default SoundDetector;
