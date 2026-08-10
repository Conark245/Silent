import re
with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

sse_old = """      eventSource.addEventListener('donation_approved', (e: MessageEvent) => {
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
      });"""

sse_new = """      eventSource.addEventListener('donation_approved', (e: MessageEvent) => {
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
      });"""

content = content.replace(sse_old, sse_new)

with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
