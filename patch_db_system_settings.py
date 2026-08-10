with open('server/db.ts', 'r') as f:
    content = f.read()

load_tg_settings = """      const tgSettings: any = await TelegramSettingsModel.findOne().lean();
      if (tgSettings) {
        this.cache.telegram_settings = {
          botToken: tgSettings.botToken,
          adminIds: tgSettings.adminIds,
          webhookUrl: tgSettings.webhookUrl,
          isWebhookActive: tgSettings.isWebhookActive,
        };
      }"""

load_sys_settings = load_tg_settings + """

      // System Settings
      const sysSettings: any = await SystemSettingsModel.findOne().lean();
      if (sysSettings) {
        this.cache.system_settings = {
          defaultSoundId: sysSettings.defaultSoundId,
          themeConfig: sysSettings.themeConfig || {
            fontFamily: 'Inter',
            backgroundColor: 'transparent',
            animationSpeed: 1,
          }
        };
      }"""

content = content.replace(load_tg_settings, load_sys_settings)

with open('server/db.ts', 'w') as f:
    f.write(content)
