with open('server.ts', 'r') as f:
    content = f.read()

overlay_recent = """  app.get('/api/overlay/recent-donors', (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const recent = db.getDonations('APPROVED').slice(0, limit);
    res.json(recent);
  });"""

overlay_settings = overlay_recent + """

  // Get overlay settings (theme)
  app.get('/api/overlay/settings', (_req, res) => {
    const settings = db.getSystemSettings();
    res.json({ themeConfig: settings.themeConfig });
  });"""

content = content.replace(overlay_recent, overlay_settings)

with open('server.ts', 'w') as f:
    f.write(content)
