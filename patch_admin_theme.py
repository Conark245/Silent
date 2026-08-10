import re
with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# Add theme tab button
media_btn = """            </button>

            <button
              onClick={() => setActiveTab('telegram')}"""

theme_btn = """            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'theme'
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="w-5 h-5" />
              <span className="whitespace-nowrap">Theme Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}"""

content = content.replace(media_btn, theme_btn)

# Add load logic for theme
load_logic_media = """      } else if (activeTab === 'media') {
        const [mediaRes, sysRes] = await Promise.all(["""

load_logic_theme = """      } else if (activeTab === 'theme') {
        const sysRes = await fetch('/api/admin/system-settings');
        if (sysRes.status === 401) { onLogout(); return; }
        if (sysRes.ok) {
          const sysData = await safeParseJson(sysRes);
          if (sysData) setSystemSettings(sysData);
        }
      } else if (activeTab === 'media') {
        const [mediaRes, sysRes] = await Promise.all(["""

content = content.replace(load_logic_media, load_logic_theme)

# We need to import Palette
import_lucide = "from 'lucide-react';"
import_lucide_new = "  Palette,\n} from 'lucide-react';"
content = content.replace(import_lucide, import_lucide_new)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
