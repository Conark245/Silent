with open('server/db.ts', 'r') as f:
    content = f.read()

methods = """
  // --- SYSTEM SETTINGS ---
  getSystemSettings(): SystemSettings {
    return this.cache.system_settings;
  }
  updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.cache.system_settings = { ...this.cache.system_settings, ...updates };
    if (this.isConnected) {
      (SystemSettingsModel as any).updateOne({}, this.cache.system_settings, { upsert: true }).catch((err: any) =>
        console.error('[MongoDB] SystemSettings update error:', err)
      );
    }
    return this.cache.system_settings;
  }

  // --- TELEGRAM SETTINGS ---"""

content = content.replace("  // --- TELEGRAM SETTINGS ---", methods)

with open('server/db.ts', 'w') as f:
    f.write(content)
