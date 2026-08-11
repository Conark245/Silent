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

  const getTransformedSrc = () => {
    if (isGreenScreen) { return src + (src.includes("?") ? "&" : "?") + "corsbuster=1"; } return src;
  };

  const finalSrc = getTransformedSrc();
  const useCanvas = isGreenScreen;

  // Sync volume level and muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume ?? 0.8;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Video Green Screen Chroma Keying (Local Canvas fallback)
  useEffect(() => {
    if (!useCanvas || type !== 'video') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isActive = true;

    const processFrame = () => {
      if (!isActive || !video) return;

      if (video.readyState >= 2) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        try {
          ctx.drawImage(video, 0, 0, width, height);
          const frame = ctx.getImageData(0, 0, width, height);
          const data = frame.data;
          const len = data.length;

          for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Key out dominant green color pixels
            if (g > 50 && g > r * 1.1 && g > b * 1.1) {
              const maxOther = Math.max(r, b);
              const diff = g - maxOther;
              if (diff > 20) {
                data[i + 3] = 0; // Fully transparent
              } else {
                data[i + 3] = Math.max(0, Math.min(255, 255 - (diff / 20) * 255)); // Soft edge
                data[i + 1] = g - (diff * (diff / 20));
              }
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch (e: any) {
          console.warn('[GreenScreenMedia] Canvas pixel extraction failed (CORS issue?). Green screen cannot be removed.', e.message);
        }
      }

      if (isActive) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    const handlePlay = () => {
      if (onPlay) onPlay();
    };

    video.addEventListener('play', handlePlay);

    // Force play in case autoplay was ignored
    if (autoPlay && video.paused) {
      video.volume = volume ?? 0.8;
      video.muted = muted;
      video.play().catch((e) => {
        console.warn('[GreenScreenMedia] Autoplay with sound failed, trying muted:', e);
        video.muted = true;
        video.play().catch((err) => console.warn('[GreenScreenMedia] Muted autoplay also failed:', err));
      });
    }

    // Start immediately
    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isActive = false;
      video.removeEventListener('play', handlePlay);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [useCanvas, type, finalSrc, onPlay]);

  // Image / Sticker Green Screen Chroma Keying (Local Canvas fallback)
  useEffect(() => {
    if (!useCanvas || (type !== 'sticker' && type !== 'image')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isCancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = finalSrc;

    img.onload = () => {
      if (isCancelled) return;
      canvas.width = img.width;
      canvas.height = img.height;
      try {
        ctx.drawImage(img, 0, 0);

        const frame = ctx.getImageData(0, 0, img.width, img.height);
        const data = frame.data;
        const len = data.length;

        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (g > 50 && g > r * 1.1 && g > b * 1.1) {
            const maxOther = Math.max(r, b);
            const diff = g - maxOther;
            if (diff > 20) {
              data[i + 3] = 0;
            } else {
              data[i + 3] = Math.max(0, Math.min(255, 255 - (diff / 20) * 255));
              data[i + 1] = g - (diff * (diff / 20));
            }
          }
        }

        ctx.putImageData(frame, 0, 0);
      } catch (e) {
        console.warn('Canvas image processing failed (likely CORS):', e);
      }
    };

    img.onerror = (err) => {
      if (isCancelled) return;
      console.warn('[GreenScreenMedia] Image load error:', err);
    };

    return () => {
      isCancelled = true;
    };
  }, [useCanvas, type, finalSrc]);

  // Standard Media (No local Canvas needed)
  if (!useCanvas) {
    if (type === 'video') {
      return (
        <video
          ref={videoRef}
          src={finalSrc}
          crossOrigin="anonymous"
          className={className}
          autoPlay={autoPlay}
          playsInline={playsInline}
          muted={muted}
          loop={loop}
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = volume ?? 0.8;
            e.currentTarget.muted = muted;
          }}
          onEnded={onEnded}
          onPlay={onPlay}
          onError={(e) => console.warn('[GreenScreenMedia] Video error:', e.currentTarget.error?.message)}
          onStalled={() => console.warn('[GreenScreenMedia] Video stalled')}
        />
      );
    }
    return <img src={finalSrc} crossOrigin="anonymous" alt={alt} className={className} />;
  }

  // Chroma Key Enabled (Local Canvas fallback)
  return (
    <div className="relative inline-flex items-center justify-center">
      {type === 'video' && (
        <video
          ref={videoRef}
          src={finalSrc}
          crossOrigin="anonymous"
          autoPlay={autoPlay}
          playsInline={playsInline}
          muted={muted}
          loop={loop}
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = volume ?? 0.8;
            e.currentTarget.muted = muted;
          }}
          onEnded={onEnded}
          onPlay={onPlay}
          onError={(e) => console.warn('[GreenScreenMedia] Video error (Chroma Key):', e.currentTarget.error?.message)}
          onStalled={() => console.warn('[GreenScreenMedia] Video stalled (Chroma Key)')}
          className="absolute inset-0 w-full h-full opacity-[0.01] pointer-events-none -z-10"
        />
      )}
      <canvas ref={canvasRef} className={className} />
    </div>
  );
};
