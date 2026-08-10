with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("""          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateOverlay}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-indigo-600" />
              <span>OBS Overlay</span>
            </button>
            <button
              onClick={onNavigateAdmin}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              Admin Dashboard
            </button>
          </div>""", "")

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
