with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

default_sound_ui = """              </div>

              {/* Default Sound Settings */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Default Sound Effect</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a default MP3 sound to play automatically whenever a new donation alert is triggered, if the donation tier doesn't specify a custom sound.
                </p>
                <div className="flex items-end gap-3 max-w-md">
                  <div className="flex-1">
                    <select
                      value={systemSettings.defaultSoundId || ''}
                      onChange={(e) => setSystemSettings({ ...systemSettings, defaultSoundId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="">-- No Default Sound --</option>
                      {mediaAssets.filter(m => m.type === 'sound').map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSaveSystemSettings}
                    disabled={isSavingSystemSettings}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                  >
                    {isSavingSystemSettings ? 'Saving...' : 'Save Default'}
                  </button>
                </div>
              </div>

              {/* Upload Card */}"""

content = content.replace("              </div>\n\n              {/* Upload Card */}", default_sound_ui)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
