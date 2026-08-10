import re
with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# Add theme tab content right before {activeTab === 'telegram' && ...
# Wait, let's find the telegram tab content first.

pattern = r"          \{\/\* TAB: TELEGRAM \*\/\}"
match = re.search(pattern, content)
if match:
    idx = match.start()
    
    theme_content = """          {/* TAB: THEME SETTINGS */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  OBS Overlay Theme
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Live customization of the OBS Overlay's appearance. Changes apply immediately to the overlay without refreshing the browser source.
                </p>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-8 space-y-6 shadow-xl max-w-2xl">
                {/* Font Family */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Font Family
                  </label>
                  <select
                    value={systemSettings.themeConfig?.fontFamily || 'Inter'}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      themeConfig: {
                        ...(systemSettings.themeConfig || { backgroundColor: 'transparent', animationSpeed: 1 }),
                        fontFamily: e.target.value
                      }
                    })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Courier New">Courier New (Monospace)</option>
                    <option value="Comic Sans MS">Comic Sans (Fun)</option>
                  </select>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Background Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={systemSettings.themeConfig?.backgroundColor !== 'transparent' ? systemSettings.themeConfig?.backgroundColor || '#000000' : '#000000'}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings,
                        themeConfig: {
                          ...(systemSettings.themeConfig || { fontFamily: 'Inter', animationSpeed: 1 }),
                          backgroundColor: e.target.value
                        }
                      })}
                      disabled={systemSettings.themeConfig?.backgroundColor === 'transparent'}
                      className="w-12 h-12 rounded cursor-pointer disabled:opacity-50"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.themeConfig?.backgroundColor === 'transparent'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          themeConfig: {
                            ...(systemSettings.themeConfig || { fontFamily: 'Inter', animationSpeed: 1 }),
                            backgroundColor: e.target.checked ? 'transparent' : '#1e293b'
                          }
                        })}
                        className="w-4 h-4 text-indigo-600 rounded bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Transparent Background (OBS Default)</span>
                    </label>
                  </div>
                </div>

                {/* Text Animation Speed */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Text Animation Speed (x{systemSettings.themeConfig?.animationSpeed || 1})
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    value={systemSettings.themeConfig?.animationSpeed || 1}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      themeConfig: {
                        ...(systemSettings.themeConfig || { fontFamily: 'Inter', backgroundColor: 'transparent' }),
                        animationSpeed: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Slower</span>
                    <span>Normal (1x)</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        setIsSavingSystemSettings(true);
                        const res = await fetch('/api/admin/system-settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ themeConfig: systemSettings.themeConfig }),
                        });
                        if (!res.ok) throw new Error('Failed to save');
                        alert('Theme settings saved! They will apply immediately to the OBS overlay.');
                      } catch (err) {
                        alert('Error saving theme settings');
                      } finally {
                        setIsSavingSystemSettings(false);
                      }
                    }}
                    disabled={isSavingSystemSettings}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingSystemSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                    <span>Save Theme Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

"""
    new_content = content[:idx] + theme_content + content[idx:]
    with open('src/components/AdminDashboard.tsx', 'w') as f:
        f.write(new_content)
