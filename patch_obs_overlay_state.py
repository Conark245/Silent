with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

state_old = """  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);"""
state_new = """  const [recentDonors, setRecentDonors] = useState<Donation[]>([]);
  const [themeConfig, setThemeConfig] = useState<any>({ fontFamily: 'Inter', backgroundColor: 'transparent', animationSpeed: 1 });
  const speed = themeConfig?.animationSpeed || 1;"""

content = content.replace(state_old, state_new)

with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
