import re
with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

# 1. State for theme settings
state_old = """  const [activeAlert, setActiveAlert] = useState<DonationEvent | null>(null);"""
state_new = """  const [activeAlert, setActiveAlert] = useState<DonationEvent | null>(null);
  const [themeConfig, setThemeConfig] = useState<any>({ fontFamily: 'Inter', backgroundColor: 'transparent', animationSpeed: 1 });"""
content = content.replace(state_old, state_new)

# 2. Fetch theme settings
fetch_recent = """  const fetchRecentDonors = async () => {
    try {
      const res = await fetch('/api/overlay/recent-donors?limit=5');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentDonors(data);
        }
      }
    } catch (e) {
      console.error('[OBS Overlay] Error fetching recent donors:', e);
    }
  };"""

fetch_both = """  const fetchRecentDonors = async () => {
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
  };"""

content = content.replace(fetch_recent, fetch_both)

# 3. Apply theme settings to the wrapper
wrapper_old = """  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center relative bg-transparent">"""

wrapper_new = """  return (
    <div 
      className="w-screen h-screen overflow-hidden flex items-center justify-center relative"
      style={{
        backgroundColor: themeConfig.backgroundColor !== 'transparent' ? themeConfig.backgroundColor : 'transparent',
        fontFamily: themeConfig.fontFamily || 'Inter'
      }}
    >"""

content = content.replace(wrapper_old, wrapper_new)

# 4. Modify Framer Motion animation speed. Let's see what is there.
with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
