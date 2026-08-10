import React, { useEffect, useRef } from 'react';

interface GreenScreenMediaProps {
  src: string;
  type: 'video' | 'sticker' | 'image';
  isGreenScreen?: boolean;
  className?: string;
  autoPlay?: boolean;
  playsInline?: boolean;
  muted?: boolean;
  loop?: boolean;
  volume?: number;
  alt?: string;
  onEnded?: () => void;
  onPlay?: () => void;
}

export const GreenScreenMedia: React.FC<GreenScreenMediaProps> = ({
  src,
  type,
  isGreenScreen = false,
  className = '',
  autoPlay = true,
  playsInline = true,
  muted = false,
  loop = false,
  volume = 0.8,
  alt = 'Media',
  onEnded,
  onPlay,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync volume level
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume ?? 0.8;
    }
  }, [volume]);

  // Video Green Screen Chroma Keying
  useEffect(() => {
    if (!isGreenScreen || type !== 'video') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isActive = true;

    const processFrame = () => {
      if (!isActive || !video) return;

      if (!video.paused && !video.ended) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const frame = ctx.getImageData(0, 0, width, height);
        const data = frame.data;
        const len = data.length;

        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Key out dominant green color pixels
          if (g > 55 && g > r * 1.15 && g > b * 1.15) {
            const maxOther = Math.max(r, b);
            const diff = g - maxOther;
            if (diff > 35) {
              data[i + 3] = 0; // Fully transparent
            } else {
              data[i + 3] = Math.max(0, Math.min(255, 255 - (diff / 35) * 255)); // Soft edge
            }
          }
        }

        ctx.putImageData(frame, 0, 0);
      }

      if (isActive) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    const handlePlay = () => {
      if (onPlay) onPlay();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);
    if (!video.paused) {
      handlePlay();
    } else {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      isActive = false;
      video.removeEventListener('play', handlePlay);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isGreenScreen, type, src, onPlay]);

  // Image / Sticker Green Screen Chroma Keying
  useEffect(() => {
    if (!isGreenScreen || (type !== 'sticker' && type !== 'image')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const frame = ctx.getImageData(0, 0, img.width, img.height);
      const data = frame.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (g > 55 && g > r * 1.15 && g > b * 1.15) {
          const maxOther = Math.max(r, b);
          const diff = g - maxOther;
          if (diff > 35) {
            data[i + 3] = 0;
          } else {
            data[i + 3] = Math.max(0, Math.min(255, 255 - (diff / 35) * 255));
          }
        }
      }

      ctx.putImageData(frame, 0, 0);
    };
  }, [isGreenScreen, type, src]);

  // Standard Media (No Green Screen Removal)
  if (!isGreenScreen) {
    if (type === 'video') {
      return (
        <video
          ref={videoRef}
          src={src}
          className={className}
          autoPlay={autoPlay}
          playsInline={playsInline}
          muted={muted}
          loop={loop}
          onEnded={onEnded}
          onPlay={onPlay}
        />
      );
    }
    return <img src={src} alt={alt} className={className} />;
  }

  // Chroma Key Enabled
  return (
    <div className="relative inline-flex items-center justify-center">
      {type === 'video' && (
        <video
          ref={videoRef}
          src={src}
          autoPlay={autoPlay}
          playsInline={playsInline}
          muted={muted}
          loop={loop}
          onEnded={onEnded}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />
      )}
      <canvas ref={canvasRef} className={className} />
    </div>
  );
};
