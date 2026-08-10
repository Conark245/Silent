with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
"""          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">DonationLive</h1>
              <p className="text-xs text-slate-500">Support stream & trigger OBS media live</p>
            </div>
          </div>""",
"""          <div className="flex items-center gap-3">
            <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">DonationLive</h1>
          </div>"""
)

content = content.replace(
"""      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p>OBS Live Donation System • Real-time Stream Alerts & Media Overlay</p>
      </footer>""",
""
)

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
