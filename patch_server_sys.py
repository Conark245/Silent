with open('server.ts', 'r') as f:
    content = f.read()

old_post = """  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
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
  });"""

new_post = """  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { defaultSoundId, themeConfig } = req.body;
    
    const updates: any = {};
    if (defaultSoundId !== undefined) updates.defaultSoundId = defaultSoundId;
    if (themeConfig !== undefined) updates.themeConfig = themeConfig;

    const updated = db.updateSystemSettings(updates);
    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      metadata: { updated: true },
    });
    res.json({ success: true, settings: updated });
  });"""

content = content.replace(old_post, new_post)

with open('server.ts', 'w') as f:
    f.write(content)
