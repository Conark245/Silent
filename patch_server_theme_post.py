with open('server.ts', 'r') as f:
    content = f.read()

post_settings_old = """  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
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

post_settings_new = """  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { defaultSoundId, themeConfig } = req.body;
    
    const updates: any = {};
    if (defaultSoundId !== undefined) updates.defaultSoundId = defaultSoundId;
    if (themeConfig !== undefined) updates.themeConfig = themeConfig;

    const updated = db.updateSystemSettings(updates);
    
    if (themeConfig !== undefined) {
      realtimeServer.broadcastThemeUpdate(updated.themeConfig);
    }
    
    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      metadata: { updated: true },
    });
    res.json({ success: true, settings: updated });
  });"""

content = content.replace(post_settings_old, post_settings_new)

with open('server.ts', 'w') as f:
    f.write(content)
