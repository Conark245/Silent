with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

save_logic = """  const handleSaveSystemSettings = async () => {
    try {
      setIsSavingSystemSettings(true);
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSoundId: systemSettings.defaultSoundId }),
      });
      if (!res.ok) {
        alert('Failed to save default sound settings');
      } else {
        alert('Default sound settings saved');
      }
    } catch (err) {
      alert('Error saving system settings');
    } finally {
      setIsSavingSystemSettings(false);
    }
  };

  const handleSaveTelegramSettings = async (e: React.FormEvent) => {"""

content = content.replace("  const handleSaveTelegramSettings = async (e: React.FormEvent) => {", save_logic)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
