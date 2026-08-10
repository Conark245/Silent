import re

with open('server/models.ts', 'r') as f:
    content = f.read()

content = content.replace("  TelegramSettings,", "  TelegramSettings,\n  SystemSettings,")

schema_addition = """
// System Settings Schema
const SystemSettingsSchema = new Schema({
  defaultSoundId: { type: String, default: '' },
});
"""
content = content.replace("export const AdminModel", schema_addition + "\nexport const AdminModel")
content = content.replace("export const TelegramSettingsModel = mongoose.models.TelegramSettings || mongoose.model('TelegramSettings', TelegramSettingsSchema);", "export const TelegramSettingsModel = mongoose.models.TelegramSettings || mongoose.model('TelegramSettings', TelegramSettingsSchema);\nexport const SystemSettingsModel = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);")

with open('server/models.ts', 'w') as f:
    f.write(content)
