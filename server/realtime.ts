import { Response } from 'express';
import { DonationEvent } from '../src/types';

class RealtimeServer {
  private clients: Set<Response> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic keep-alive ping every 15 seconds
    this.pingInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 15000);
  }

  addClient(res: Response) {
    this.clients.add(res);

    // Initial connection comment
    res.write(`: connected at ${new Date().toISOString()}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  private sendKeepAlive() {
    for (const client of this.clients) {
      try {
        client.write(`: ping\n\n`);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  broadcastDonationEvent(event: DonationEvent) {
    const payload = JSON.stringify(event);
    const message = `event: donation_approved\ndata: ${payload}\n\n`;

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
    const message = `event: theme_updated\ndata: ${payload}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeServer = new RealtimeServer();
