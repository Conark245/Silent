with open('server/db.ts', 'r') as f:
    content = f.read()

# Fix cache init
content = content.replace(
    "    telegram_settings: { ...initialTelegramSettings },",
    "    telegram_settings: { ...initialTelegramSettings },\n    system_settings: { defaultSoundId: '' } as SystemSettings,"
)

# Remove the broken injection block
broken_block = """      // --- SYSTEM SETTINGS ---
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
  updateSystemSettings: async (updates: Partial<SystemSettings>): Promise<SystemSettings> => {
    let settings = await SystemSettingsModel.findOne();
    if (!settings) {
      settings = await SystemSettingsModel.create(updates);
    } else {
      if (updates.defaultSoundId !== undefined) settings.defaultSoundId = updates.defaultSoundId;
      await settings.save();
    }
    return {
      defaultSoundId: settings.defaultSoundId,
    };
  },"""

content = content.replace(broken_block, "")

# Find where to add system_settings fetch in seedAndLoadFromMongoDB
# Wait, let's just find the end of telegram_settings load in seedAndLoadFromMongoDB

content = content.replace(
    """      const tSetting = await (TelegramSettingsModel as any).findOne();
      if (tSetting) this.cache.telegram_settings = tSetting.toObject();""",
    """      const tSetting = await (TelegramSettingsModel as any).findOne();
      if (tSetting) this.cache.telegram_settings = tSetting.toObject();
      const sSetting = await (SystemSettingsModel as any).findOne();
      if (sSetting) this.cache.system_settings = sSetting.toObject();"""
)

# Now inject the new methods at the bottom of MongoDatabase class, right before "getTelegramSettings"
methods = """  // --- SYSTEM SETTINGS ---
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
