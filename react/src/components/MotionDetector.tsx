import React, { useEffect, useRef } from 'react';

interface MotionDetectorProps {
  stream: MediaStream | null;
  onMotion: () => void;
}

const MotionDetector: React.FC<MotionDetectorProps> = ({ stream, onMotion }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrame = useRef<ImageData | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const processFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (lastFrame.current) {
          const diff = getFrameDiff(lastFrame.current, currentFrame);
          if (diff > 5) { // Threshold for motion detection
            onMotion();
          }
        }
        lastFrame.current = currentFrame;
      }
    }
    requestRef.current = requestAnimationFrame(processFrame);
  };

  const getFrameDiff = (frame1: ImageData, frame2: ImageData) => {
    const data1 = frame1.data;
    const data2 = frame2.data;
    let diff = 0;
    const threshold = 30; // Color difference threshold

    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i];
      const g1 = data1[i + 1];
      const b1 = data1[i + 2];
      const r2 = data2[i];
      const g2 = data2[i + 1];
      const b2 = data2[i + 2];

      const colorDiff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (colorDiff > threshold) {
        diff++;
      }
    }
    return (diff / (frame1.width * frame1.height)) * 100; // Percentage of different pixels
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} autoPlay playsInline muted width="160" height="120" />
      <canvas ref={canvasRef} width="160" height="120" />
    </div>
  );
};

export default MotionDetector;
