import re
with open('server/realtime.ts', 'r') as f:
    content = f.read()

broadcast_theme = """
  broadcastThemeUpdate(themeConfig: any) {
    const payload = JSON.stringify(themeConfig);
    const message = `event: theme_updated\\ndata: ${payload}\\n\\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {"""

content = content.replace("  getClientCount(): number {", broadcast_theme)

with open('server/realtime.ts', 'w') as f:
    f.write(content)
