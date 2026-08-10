import re

with open('server/db.ts', 'r') as f:
    content = f.read()

content = content.replace("  TelegramSettings,", "  TelegramSettings,\n  SystemSettings,")
content = content.replace("  TelegramSettingsModel,", "  TelegramSettingsModel,\n  SystemSettingsModel,")

# Add SystemSettings methods
db_methods = """
  // System Settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    let settings = await SystemSettingsModel.findOne();
    if (!settings) {
      settings = await SystemSettingsModel.create({});
    }
    return {
      defaultSoundId: settings.defaultSoundId,
    };
  },
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
  },
"""

content = content.replace("  // Payment Methods", db_methods + "\n  // Payment Methods")

with open('server/db.ts', 'w') as f:
    f.write(content)
