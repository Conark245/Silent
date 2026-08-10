import re
with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

# Helper for animation speed
helper = """  const speed = themeConfig.animationSpeed || 1;"""

state_search = """  const [themeConfig, setThemeConfig] = useState<any>({ fontFamily: 'Inter', backgroundColor: 'transparent', animationSpeed: 1 });"""
content = content.replace(state_search, state_search + "\n" + helper)

content = content.replace(
    "transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.8 }}",
    "transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.8, bounce: 0.25 / speed }}"
)

content = content.replace(
    "transition={{ delay: 0.15, duration: 0.35 }}",
    "transition={{ delay: 0.15 / speed, duration: 0.35 / speed }}"
)

content = content.replace(
    """transition={{
                      scale: { duration: 0.4, type: 'spring', stiffness: 300 },
                      rotate: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                    }}""",
    """transition={{
                      scale: { duration: 0.4 / speed, type: 'spring', stiffness: 300 },
                      rotate: { duration: 2.2 / speed, repeat: Infinity, ease: 'easeInOut' },
                    }}"""
)

content = content.replace(
    "transition={{ delay: 0.28, type: 'spring', stiffness: 320, damping: 18 }}",
    "transition={{ delay: 0.28 / speed, type: 'spring', stiffness: 320, damping: 18 }}"
)

content = content.replace(
    "transition={{ delay: 0.35, duration: 0.3 }}",
    "transition={{ delay: 0.35 / speed, duration: 0.3 / speed }}"
)

content = content.replace(
    "transition={{ delay: 0.4, duration: 0.35 }}",
    "transition={{ delay: 0.4 / speed, duration: 0.35 / speed }}"
)

with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
