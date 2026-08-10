with open('server.ts', 'r') as f:
    content = f.read()

system_settings_routes = """
  app.get('/api/admin/system-settings', requireAdminAuth, (_req, res) => {
    res.json(db.getSystemSettings());
  });
  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { defaultSoundId } = req.body;
    const updated = db.updateSystemSettings({
      defaultSoundId: defaultSoundId !== undefined ? defaultSoundId : undefined,
    });
    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      metadata: { defaultSoundId: updated.defaultSoundId },
    });
    res.json({ success: true, settings: updated });
  });
"""

content = content.replace("  app.get('/api/admin/telegram-settings', requireAdminAuth, (_req, res) => {", system_settings_routes + "\n  app.get('/api/admin/telegram-settings', requireAdminAuth, (_req, res) => {")

with open('server.ts', 'w') as f:
    f.write(content)
