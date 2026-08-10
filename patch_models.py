with open('server/models.ts', 'r') as f:
    content = f.read()

settings_old = """const SystemSettingsSchema = new Schema({
  defaultSoundId: { type: String, default: '' },
});"""

settings_new = """const SystemSettingsSchema = new Schema({
  defaultSoundId: { type: String, default: '' },
  themeConfig: {
    fontFamily: { type: String, default: 'Inter' },
    backgroundColor: { type: String, default: 'transparent' },
    animationSpeed: { type: Number, default: 1 },
  },
});"""

content = content.replace(settings_old, settings_new)

with open('server/models.ts', 'w') as f:
    f.write(content)
