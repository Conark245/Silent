import React, { useEffect, useRef, useState } from 'react';
import { Donation, DonationEvent } from '../types';
import { Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

    // Play Video if configured
    if (payload.video && payload.video.url && videoRef.current) {
      try {
        videoRef.current.src = payload.video.url;
        videoRef.current.volume = payload.video.volume ?? 0.8;
        videoRef.current.play().catch(() => {});
      } catch (err) {
        console.error('[OBS Overlay] Video play error:', err);
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
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentEvent(null);
      isProcessingRef.current = false;
    }, duration * 1000);
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
      {/* Audio Unmute Helper Banner for OBS Browser Source */}
      {!hasInteracted && (
        <div className="absolute top-4 right-4 z-50 bg-slate-900/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg cursor-pointer hover:bg-slate-800">
          <VolumeX className="w-4 h-4 text-amber-400" />
          <span>Click anywhere to enable OBS audio</span>
        </div>
      )}

      {/* Recent Donors Scrolling Marquee Banner Widget */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl bg-slate-950/85 border border-amber-500/40 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl flex items-center gap-3 overflow-hidden text-white z-20">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider shrink-0 shadow-md">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span className="whitespace-nowrap">RECENT DONORS</span>
        </div>

        <div className="flex-1 overflow-hidden relative whitespace-nowrap">
          <div className="animate-marquee">
            {recentDonors.length > 0 ? (
              [...recentDonors, ...recentDonors].map((d, index) => (
                <div key={`${d.id}-${index}`} className="inline-flex items-center gap-2 text-xs font-bold mr-8">
                  
                  <span className="text-emerald-400 font-mono font-black">
                    +{d.amount.toLocaleString()} {d.currency || 'MMK'}
                  </span>
                  {d.donationItemName && (
                    <span className="text-indigo-300 text-[10px] bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-500/30 font-medium">
                      {d.donationItemName}
                    </span>
                  )}
                  <span className="text-slate-600 font-bold ml-1">•</span>
                </div>
              ))
            ) : (
              <div className="inline-flex items-center gap-2 text-xs font-bold mr-8 text-slate-500">
                Awaiting new donations...
              </div>
            )}
          </div>
        </div>
      </div>

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
            <div className="bg-slate-950/90 border-2 border-amber-500/80 rounded-3xl p-8 shadow-2xl shadow-amber-500/20 backdrop-blur-md text-white text-center relative overflow-hidden">
              {/* Background Glow */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"
              />

              {/* Top Badge */}
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15 / speed, duration: 0.35 / speed }}
                className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest mb-4 shadow-lg"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>NEW DONATION ALERT!</span>
              </motion.div>

              {/* Sticker / Video Media Section */}
              <div className="my-4 flex justify-center items-center min-h-[160px]">
                {video?.url ? (
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && video) {
                        el.volume = video.volume ?? 0.8;
                      }
                    }}
                    src={video.url}
                    autoPlay
                    playsInline
                    muted={muted}
                    className="max-h-56 max-w-full rounded-2xl border border-slate-800 shadow-xl object-contain"
                  />
                ) : sticker?.url ? (
                  <motion.img
                    initial={{ scale: 0.4, rotate: -10 }}
                    animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
                    transition={{
                      scale: { duration: 0.4 / speed, type: 'spring', stiffness: 300 },
                      rotate: { duration: 2.2 / speed, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    src={sticker.url}
                    alt={sticker.name}
                    className="w-44 h-44 object-contain filter drop-shadow-[0_10px_25px_rgba(255,215,0,0.5)]"
                  />
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

              {/* Reward Item Name */}
              {item?.name && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 / speed, duration: 0.3 / speed }}
                  className="inline-block px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-3"
                >
                  🎁 {item.name}
                </motion.div>
              )}

              {/* Message */}
              {donation.message && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 / speed, duration: 0.35 / speed }}
                  className="mt-4 pt-4 border-t border-slate-800/80 max-w-lg mx-auto"
                >
                  <p className="text-lg text-slate-200 font-medium italic">
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
