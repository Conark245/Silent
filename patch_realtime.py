with open('server/realtime.ts', 'r') as f:
    content = f.read()

broadcast_donation = """  broadcastDonationEvent(event: DonationEvent) {
    const payload = JSON.stringify(event);
    const message = `event: donation_approved\\ndata: ${payload}\\n\\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }"""

broadcast_theme = """  broadcastDonationEvent(event: DonationEvent) {
    const payload = JSON.stringify(event);
    const message = `event: donation_approved\\ndata: ${payload}\\n\\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

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
  }"""

content = content.replace(broadcast_donation, broadcast_theme)

with open('server/realtime.ts', 'w') as f:
    f.write(content)
