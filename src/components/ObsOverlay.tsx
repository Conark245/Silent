import React, { useEffect, useRef, useState } from 'react';
import { Donation, DonationEvent } from '../types';
import { Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GreenScreenMedia } from './GreenScreenMedia';

export const ObsOverlay: React.FC = () => {
  const [queue, setQueue] = useState<DonationEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<DonationEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
  const [themeConfig, setThemeConfig] = useState<any>({ fontFamily: 'Inter', backgroundColor: 'transparent', animationSpeed: 1 });
  const speed = themeConfig?.animationSpeed || 1;

  // Track processed event IDs to prevent duplicate playback
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const finishEventHandledRef = useRef<boolean>(false);

  // Enable audio interaction handler for browser policies
  const enableAudio = () => {
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const fetchRecentDonors = async () => {
    try {
      const res = await fetch('/api/overlay/recent-donors?limit=5');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentDonors(data);
        }
      }
      
      const themeRes = await fetch('/api/overlay/settings');
      if (themeRes.ok) {
        const themeData = await themeRes.json();
        if (themeData.themeConfig) {
          setThemeConfig(themeData.themeConfig);
        }
      }
    } catch (e) {
      console.error('[OBS Overlay] Error fetching recent donors or theme:', e);
    }
  };

  // 1. Initial Queue Fetch, Recent Donors & EventSource Realtime Listener
  useEffect(() => {
    fetchInitialQueue();
    fetchRecentDonors();

    const interval = setInterval(fetchRecentDonors, 8000);

    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/overlay/events');

      eventSource.onopen = () => {
        console.log('[OBS Overlay] Connected to realtime SSE stream.');
      };

      eventSource.addEventListener('donation_approved', (e: MessageEvent) => {
        try {
          const event: DonationEvent = JSON.parse(e.data);
          if (event && event.eventId && !processedEventIdsRef.current.has(event.eventId)) {
            console.log('[OBS Overlay] New donation event received:', event);
            setQueue((prev) => [...prev, event]);
            fetchRecentDonors();
          }
        } catch (err) {
          console.error('[OBS Overlay] Failed to parse event SSE:', err);
        }
      });

      eventSource.addEventListener('theme_updated', (e: MessageEvent) => {
        try {
          const newTheme = JSON.parse(e.data);
          console.log('[OBS Overlay] New theme settings received:', newTheme);
          setThemeConfig(newTheme);
        } catch (err) {
          console.error('[OBS Overlay] Failed to parse theme SSE:', err);
        }
      });

      eventSource.onerror = (err) => {
        console.warn('[OBS Overlay] SSE connection error, reconnecting in 3s...', err);
        eventSource?.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const fetchInitialQueue = async () => {
    try {
      const res = await fetch('/api/overlay/queue');
      if (res.ok) {
        const events: DonationEvent[] = await res.json();
        const freshEvents = events.filter((e) => !processedEventIdsRef.current.has(e.eventId));
        if (freshEvents.length > 0) {
          setQueue((prev) => [...prev, ...freshEvents]);
        }
      }
    } catch (e) {
      console.error('[OBS Overlay] Failed to fetch queue:', e);
    }
  };

  // 2. Queue Consumer Engine
  useEffect(() => {
    if (queue.length > 0 && !isPlaying && !isProcessingRef.current) {
      const nextEvent = queue[0];
      setQueue((prev) => prev.slice(1));
      playEvent(nextEvent);
    }
  }, [queue, isPlaying]);

  const playEvent = async (event: DonationEvent) => {
    if (processedEventIdsRef.current.has(event.eventId)) {
      return; // Skip duplicate
    }

    processedEventIdsRef.current.add(event.eventId);
    isProcessingRef.current = true;
    finishEventHandledRef.current = false;
    setCurrentEvent(event);
    setIsPlaying(true);

    const payload = event.payload;
    const duration = payload.item?.displayDuration || 8; // default 8 seconds

    // Play Sound if configured
    if (payload.sound && payload.sound.url && !muted) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = payload.sound.url;
        audioRef.current.volume = payload.sound.volume ?? 0.8;
        audioRef.current.play().catch((err) => {
          console.warn('[OBS Overlay] Audio auto-play blocked by browser:', err);
        });
      } catch (err) {
        console.error('[OBS Overlay] Audio play error:', err);
      }
    }

    // Mark processed on server
    try {
      await fetch(`/api/overlay/events/${event.eventId}/mark-processed`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('[OBS Overlay] Error marking event processed:', err);
    }

    // Wait for configured duration, then finish event
    timeoutIdRef.current = setTimeout(() => {
      finishEvent();
    }, duration * 1000);
  };

  const finishEvent = () => {
    if (finishEventHandledRef.current) return;
    finishEventHandledRef.current = true;
    
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    setIsPlaying(false);
    setCurrentEvent(null);
    isProcessingRef.current = false;
  };

  const payload = currentEvent?.payload;
  const donation = payload?.donation;
  const item = payload?.item;
  const sticker = payload?.sticker;
  const sound = payload?.sound;
  const video = payload?.video;

  return (
    <div
      onClick={enableAudio}
      className="w-screen h-screen bg-transparent overflow-hidden relative flex items-center justify-center font-sans select-none"
    >




      {/* Media Sound Element */}
      <audio ref={audioRef} />

      {/* Event Alert Popup Container */}
      <AnimatePresence>
        {isPlaying && donation && (
          <motion.div
            key={currentEvent?.eventId || 'donation-alert'}
            initial={{ opacity: 0, scale: 0.75, y: 60, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, y: -50, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.8, bounce: 0.25 / speed }}
            className="max-w-2xl w-full mx-4 relative z-30"
          >
            <div className="text-white text-center relative">


              {/* Sticker / Video Media Section */}
              <div className="my-4 flex justify-center items-center min-h-[160px]">
                {video?.url ? (
                  <GreenScreenMedia
                    src={video.url}
                    type="video"
                    isGreenScreen={Boolean(video.isGreenScreen || item?.isGreenScreen)}
                    volume={video.volume ?? 0.8}
                    muted={muted}
                    autoPlay={true}
                    playsInline={true}
                    onEnded={finishEvent}
                    className="max-h-56 max-w-full rounded-2xl border border-slate-800 shadow-xl object-contain"
                  />
                ) : sticker?.url ? (
                  <motion.div
                    initial={{ scale: 0.4, rotate: -10 }}
                    animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
                    transition={{
                      scale: { duration: 0.4 / speed, type: 'spring', stiffness: 300 },
                      rotate: { duration: 2.2 / speed, repeat: Infinity, ease: 'easeInOut' },
                    }}
                  >
                    <GreenScreenMedia
                      src={sticker.url}
                      type="sticker"
                      isGreenScreen={Boolean(sticker.isGreenScreen || item?.isGreenScreen)}
                      alt={sticker.name}
                      className="w-44 h-44 object-contain filter drop-shadow-[0_10px_25px_rgba(255,215,0,0.5)]"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-36 h-36 rounded-full bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 text-5xl font-black shadow-inner"
                  >
                    ⭐
                  </motion.div>
                )}
              </div>

              {/* Donor Name & Amount */}
              

              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.28 / speed, type: 'spring', stiffness: 320, damping: 18 }}
                className="text-2xl font-black text-emerald-400 font-mono my-2"
              >
                +{donation.amount.toLocaleString()} {donation.currency}
              </motion.div>

              {/* Message */}
              {donation.message && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 / speed, duration: 0.35 / speed }}
                  className="mt-2 max-w-lg mx-auto"
                >
                  <p className="text-xl md:text-2xl text-white font-black italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] stroke-black stroke-2" style={{ textShadow: '0px 2px 10px rgba(0,0,0,0.8), 0px 4px 20px rgba(0,0,0,0.8)' }}>
                    "{donation.message}"
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
