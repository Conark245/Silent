import re

with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

# Fix video rendering
old_video = """                {video?.url ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    className="max-h-56 max-w-full rounded-2xl border border-slate-800 shadow-xl object-contain"
                  />
                ) : sticker?.url ? ("""

new_video = """                {video?.url ? (
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
                ) : sticker?.url ? ("""

content = content.replace(old_video, new_video)

with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
