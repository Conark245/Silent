with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "  TelegramSettings,",
    "  TelegramSettings,\n  SystemSettings,"
)

content = content.replace(
    """  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    adminIds: [],
    webhookUrl: '',
    isWebhookActive: false,
  });""",
    """  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    adminIds: [],
    webhookUrl: '',
    isWebhookActive: false,
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    defaultSoundId: '',
  });
  const [isSavingSystemSettings, setIsSavingSystemSettings] = useState(false);"""
)

fetch_logic_old = """      } else if (activeTab === 'media') {
        const res = await fetch('/api/admin/media');
        if (res.status === 401) { onLogout(); return; }
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data) setMediaAssets(data);
        }"""
fetch_logic_new = """      } else if (activeTab === 'media') {
        const [mediaRes, sysRes] = await Promise.all([
          fetch('/api/admin/media'),
          fetch('/api/admin/system-settings')
        ]);
        if (mediaRes.status === 401 || sysRes.status === 401) { onLogout(); return; }
        if (mediaRes.ok) {
          const data = await safeParseJson(mediaRes);
          if (data) setMediaAssets(data);
        }
        if (sysRes.ok) {
          const sysData = await safeParseJson(sysRes);
          if (sysData) setSystemSettings(sysData);
        }"""
content = content.replace(fetch_logic_old, fetch_logic_new)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
