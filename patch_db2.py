import re

with open('server/db.ts', 'r') as f:
    content = f.read()

# Add SystemSettings to cache structure
content = content.replace("  telegram_settings: TelegramSettings;", "  telegram_settings: TelegramSettings;\n  system_settings: SystemSettings;")

# Initialize system_settings in cache
content = content.replace("telegram_settings: { botToken: '', adminIds: [], webhookUrl: '', isWebhookActive: false },", "telegram_settings: { botToken: '', adminIds: [], webhookUrl: '', isWebhookActive: false },\n      system_settings: { defaultSoundId: '' },")

# Load system settings on connect
content = content.replace("const tSetting = await (TelegramSettingsModel as any).findOne();\n      if (tSetting) this.cache.telegram_settings = tSetting.toObject();", "const tSetting = await (TelegramSettingsModel as any).findOne();\n      if (tSetting) this.cache.telegram_settings = tSetting.toObject();\n      const sSetting = await (SystemSettingsModel as any).findOne();\n      if (sSetting) this.cache.system_settings = sSetting.toObject();")

# Update get/update methods in db to use cache
new_methods = """
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
"""

content = re.sub(r'  // System Settings.*?getSystemSettings: async.*?\},', new_methods, content, flags=re.DOTALL)

with open('server/db.ts', 'w') as f:
    f.write(content)
