import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword } from './server/db';
import {
  generateAdminToken,
  setAdminAuthCookie,
  clearAdminAuthCookie,
  requireAdminAuth,
  AuthenticatedRequest,
  verifyAdminSession,
} from './server/auth';
import { sendTelegramNotification, handleTelegramWebhook, sendTelegramTestMessage } from './server/telegram';
import { realtimeServer } from './server/realtime';
import { uploadMiddleware } from './server/uploads';
import { Donation } from './src/types';
import { auditLogService } from './server/audit';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // Serve uploaded files statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Serve public static assets
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use('/assets', express.static(path.join(publicDir, 'assets')));
  }

  // --- PUBLIC API ROUTES ---

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      realtimeClients: realtimeServer.getClientCount(),
    });
  });

  // Get active payment methods for user donation page
  app.get('/api/payment-methods', (_req, res) => {
    const paymentMethods = db.getPaymentMethods(false);
    res.json(paymentMethods);
  });

  // Get active donation items
  app.get('/api/donation-items', (_req, res) => {
    const items = db.getDonationItems(false);
    res.json(items);
  });

  // Get active media assets for alert preview
  app.get('/api/media-assets', (_req, res) => {
    const media = db.getMediaAssets().filter((m) => m.enabled);
    res.json(media);
  });

  // Submit new user donation (PENDING state)
  app.post('/api/donations', async (req, res) => {
    try {
      const { donorName, amount, currency, message, paymentMethodId, paymentReference, donationItemId, paymentProofUrl } = req.body;

      

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid donation amount is required' });
      }

      const donation = db.createDonation({
        donorName: donorName ? donorName.trim() : '',
        amount: numAmount,
        currency: currency || 'MMK',
        message: message ? message.trim() : '',
        paymentMethodId: paymentMethodId || '',
        paymentReference: paymentReference ? paymentReference.trim() : '',
        paymentProofUrl: paymentProofUrl || '',
        donationItemId: donationItemId || '',
      });

      // Send Telegram notification to admin bot
      const telegramSent = await sendTelegramNotification(donation);

      db.addAuditLog({
        action: 'USER_SUBMIT_DONATION',
        targetId: donation.id,
        metadata: { publicId: donation.publicId, amount: donation.amount, telegramSent },
      });

      res.status(201).json({
        success: true,
        donation,
        message: 'Donation submitted successfully and pending admin approval via Telegram.',
      });
    } catch (err: any) {
      console.error('Error creating donation:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  // Check status of a single donation
  app.get('/api/donations/:id', (req, res) => {
    const donation = db.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    res.json(donation);
  });

  // Upload proof screenshot for donation
  app.post('/api/donations/upload-proof', uploadMiddleware.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  });

  // Telegram webhook endpoint
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const result = await handleTelegramWebhook(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('Telegram webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Simulation endpoint for Telegram callbacks (allows testing approval flow directly from web)
  app.post('/api/telegram/simulate-callback', async (req, res) => {
    try {
      const { action, donationId, adminName } = req.body;
      const testPayload = {
        callback_query: {
          id: 'sim-' + Date.now(),
          from: {
            id: '123456789', // Matches allowed sample telegram admin ID
            username: adminName || 'AdminTester',
            first_name: 'Simulated Admin',
          },
          data: `${action}:${donationId}`,
          message: {
            chat: { id: '123456789' },
            message_id: 9999,
            text: `🔔 NEW DONATION SIMULATED`,
          },
        },
      };

      const result = await handleTelegramWebhook(testPayload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- OBS OVERLAY REALTIME EVENTS (SSE) ---
  app.get('/api/overlay/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    realtimeServer.addClient(res);
  });

  // Get unprocessed approved donation events queue
  app.get('/api/overlay/queue', (_req, res) => {
    const events = db.getUnprocessedEvents();
    res.json(events);
  });

  // Get recent approved donors for OBS overlay widget marquee
  app.get('/api/overlay/recent-donors', (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const recent = db.getDonations('APPROVED').slice(0, limit);
    res.json(recent);
  });

  // Get overlay settings (theme)
  app.get('/api/overlay/settings', (_req, res) => {
    const settings = db.getSystemSettings();
    res.json({ themeConfig: settings.themeConfig });
  });

  // Mark event as processed by overlay
  app.post('/api/overlay/events/:eventId/mark-processed', (req, res) => {
    db.markEventProcessed(req.params.eventId);
    res.json({ success: true });
  });

  // --- ADMIN AUTHENTICATION & MANAGEMENT ROUTES ---

  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    if (!username || !password) {
      auditLogService.log({
        action: 'ADMIN_LOGIN_FAILED',
        metadata: { username: username || '(empty)', reason: 'Missing credentials', ip: clientIp },
      });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = db.getAdminByUsername(username);
    if (!admin) {
      auditLogService.log({
        action: 'ADMIN_LOGIN_FAILED',
        metadata: { username, reason: 'Invalid username', ip: clientIp },
      });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const hashedInput = hashPassword(password);
    if (admin.passwordHash !== hashedInput) {
      auditLogService.log({
        adminId: admin.id,
        action: 'ADMIN_LOGIN_FAILED',
        metadata: { username: admin.username, reason: 'Incorrect password', ip: clientIp },
      });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = generateAdminToken(admin.id, admin.username);
    setAdminAuthCookie(res, token);

    auditLogService.log({
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      metadata: { username: admin.username, ip: clientIp },
    });

    res.json({
      success: true,
      admin: { id: admin.id, username: admin.username, email: admin.email },
      token,
    });
  });

  app.post('/api/admin/logout', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    if (req.admin) {
      auditLogService.log({
        adminId: req.admin.id,
        action: 'ADMIN_LOGOUT',
        metadata: { username: req.admin.username },
      });
    }
    clearAdminAuthCookie(res);
    res.json({ success: true, message: 'Admin logged out' });
  });

  app.get('/api/admin/me', (req, res) => {
    const admin = verifyAdminSession(req);
    if (!admin) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, admin });
  });

  app.post('/api/admin/change-password', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const admin = db.getAdminById(req.admin!.id);
    if (!admin || admin.passwordHash !== hashPassword(currentPassword)) {
      auditLogService.log({
        adminId: req.admin!.id,
        action: 'ADMIN_CHANGE_PASSWORD_FAILED',
        metadata: { username: req.admin?.username, reason: 'Current password incorrect' },
      });
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    db.updateAdminPassword(req.admin!.id, hashPassword(newPassword));
    auditLogService.log({
      adminId: req.admin!.id,
      action: 'ADMIN_CHANGE_PASSWORD',
      metadata: { username: admin.username },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  });

  // --- PROTECTED ADMIN API ENDPOINTS ---

  // Trigger mock donation alert event for OBS overlay preview testing
  app.post('/api/admin/trigger-preview-alert', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { donorName, amount, message, donationItemId } = req.body || {};

      const activeItems = db.getDonationItems(false);
      const selectedItemId = donationItemId || (activeItems.length > 0 ? activeItems[0].id : '');
      const item = selectedItemId ? db.getDonationItemById(selectedItemId) : undefined;

      const testDonation: Donation = {
        id: 'don-test-' + Date.now(),
        publicId: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        donorName: (donorName && String(donorName).trim()) || 'VIP Supporter (Preview)',
        amount: Number(amount) || (item ? item.price : 10000),
        currency: 'MMK',
        message: (message && String(message).trim()) || '🎉 Test donation alert preview! Verifying OBS overlay animations and audio.',
        paymentMethodId: 'pm-1',
        paymentMethodName: 'KBZ Pay (Test)',
        paymentReference: 'TEST-PREVIEW-REF',
        donationItemId: selectedItemId,
        donationItemName: item ? item.name : 'Stream Preview Alert Tiers',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: req.admin?.username || 'Admin (Preview Button)',
      };

      const event = db.addDonationEvent(testDonation);
      realtimeServer.broadcastDonationEvent(event);

      auditLogService.log({
        adminId: req.admin!.id,
        action: 'TRIGGER_PREVIEW_ALERT',
        targetId: testDonation.id,
        metadata: { donorName: testDonation.donorName, amount: testDonation.amount, itemName: item?.name },
      });

      res.json({
        success: true,
        event,
        message: 'Test donation event successfully triggered and broadcasted to OBS stream overlay!',
      });
    } catch (err: any) {
      console.error('Error triggering preview alert:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/donations', requireAdminAuth, (req, res) => {
    const statusFilter = req.query.status as string | undefined;
    const donations = db.getDonations(statusFilter);
    res.json(donations);
  });

  app.delete('/api/admin/donations/history', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    db.clearDonationHistory();
    auditLogService.log({
      adminId: req.admin?.id,
      action: 'CLEAR_AUDIT_LOGS',
      metadata: { note: 'Cleared donation history' }
    });
    res.json({ success: true });
  });

  app.patch('/api/admin/donations/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { status } = req.body;
    if (status !== 'APPROVED' && status !== 'DECLINED') {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or DECLINED' });
    }

    const updated = db.updateDonationStatus(req.params.id, status, { adminId: req.admin!.username });
    if (!updated) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (status === 'APPROVED') {
      const event = db.addDonationEvent(updated);
      realtimeServer.broadcastDonationEvent(event);
    }

    auditLogService.log({
      adminId: req.admin!.id,
      action: status === 'APPROVED' ? 'ADMIN_APPROVE_DONATION' : 'ADMIN_DECLINE_DONATION',
      targetId: updated.id,
      metadata: { publicId: updated.publicId, amount: updated.amount, donorName: updated.donorName, adminUsername: req.admin!.username },
    });

    res.json(updated);
  });

  app.get('/api/admin/audit-logs', requireAdminAuth, (_req, res) => {
    const logs = auditLogService.getLogs();
    res.json(logs);
  });

  app.delete('/api/admin/audit-logs', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    auditLogService.clearLogs();
    auditLogService.log({
      adminId: req.admin?.id,
      action: 'CLEAR_AUDIT_LOGS',
      metadata: { note: 'Cleared audit logs' }
    });
    res.json({ success: true });
  });


  app.get('/api/admin/system-settings', requireAdminAuth, (_req, res) => {
    res.json(db.getSystemSettings());
  });
  app.post('/api/admin/system-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
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
  });

  app.get('/api/admin/telegram-settings', requireAdminAuth, (_req, res) => {
    const settings = db.getTelegramSettings();
    res.json(settings);
  });

  app.post('/api/admin/telegram-settings', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { botToken, adminIds, webhookUrl } = req.body;
    const updated = db.updateTelegramSettings({
      botToken: botToken !== undefined ? botToken.trim() : undefined,
      adminIds: Array.isArray(adminIds) ? adminIds.map((s: string) => s.trim()).filter(Boolean) : undefined,
      webhookUrl: webhookUrl !== undefined ? webhookUrl.trim() : undefined,
    });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_TELEGRAM_SETTINGS',
      metadata: { adminCount: updated.adminIds?.length, hasToken: !!updated.botToken },
    });

    res.json({ success: true, settings: updated });
  });

  // PAYMENT METHODS CRUD
  app.get('/api/admin/payment-methods', requireAdminAuth, (_req, res) => {
    res.json(db.getPaymentMethods(true));
  });

  app.post('/api/admin/payment-methods', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { name, description, accountName, accountNumber, phone, qrImageUrl, instructions, enabled, sortOrder } = req.body;
    if (!name || !accountName || !accountNumber) {
      return res.status(400).json({ error: 'Name, account name, and account number are required' });
    }

    const pm = db.addPaymentMethod({
      name,
      description: description || '',
      accountName,
      accountNumber,
      phone: phone || '',
      qrImageUrl: qrImageUrl || '',
      instructions: instructions || '',
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      sortOrder: Number(sortOrder) || 1,
    });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'CREATE_PAYMENT_METHOD',
      targetId: pm.id,
      metadata: { name: pm.name, accountName: pm.accountName, accountNumber: pm.accountNumber },
    });

    res.status(201).json(pm);
  });

  app.patch('/api/admin/payment-methods/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const updated = db.updatePaymentMethod(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Payment method not found' });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_PAYMENT_METHOD',
      targetId: updated.id,
      metadata: { name: updated.name, changes: Object.keys(req.body) },
    });

    res.json(updated);
  });

  app.delete('/api/admin/payment-methods/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const existing = db.getPaymentMethodById(req.params.id);
    db.deletePaymentMethod(req.params.id);

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'DELETE_PAYMENT_METHOD',
      targetId: req.params.id,
      metadata: { name: existing?.name || req.params.id },
    });

    res.json({ success: true });
  });

  // DONATION ITEMS CRUD
  app.get('/api/admin/donation-items', requireAdminAuth, (_req, res) => {
    res.json(db.getDonationItems(true));
  });

  app.post('/api/admin/donation-items', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const { name, price, currency, description, stickerId, soundId, videoId, displayDuration, enabled, sortOrder } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const item = db.addDonationItem({
      name,
      price: Number(price),
      currency: currency || 'MMK',
      description: description || '',
      stickerId: stickerId || undefined,
      soundId: soundId || undefined,
      videoId: videoId || undefined,
      displayDuration: Number(displayDuration) || 8,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      sortOrder: Number(sortOrder) || 1,
    });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'CREATE_DONATION_ITEM',
      targetId: item.id,
      metadata: { name: item.name, price: item.price, currency: item.currency },
    });

    res.status(201).json(item);
  });

  app.patch('/api/admin/donation-items/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const updated = db.updateDonationItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Donation item not found' });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_DONATION_ITEM',
      targetId: updated.id,
      metadata: { name: updated.name, price: updated.price, changes: Object.keys(req.body) },
    });

    res.json(updated);
  });

  app.delete('/api/admin/donation-items/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const existing = db.getDonationItemById(req.params.id);
    db.deleteDonationItem(req.params.id);

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'DELETE_DONATION_ITEM',
      targetId: req.params.id,
      metadata: { name: existing?.name || req.params.id },
    });

    res.json({ success: true });
  });

  // MEDIA ASSETS CRUD
  app.get('/api/admin/media', requireAdminAuth, (req, res) => {
    const type = req.query.type as string | undefined;
    res.json(db.getMediaAssets(type));
  });

  app.post('/api/admin/media/upload', requireAdminAuth, uploadMiddleware.single('file'), (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No media file provided' });
      }

      const { name, type, duration, volume } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;

      const media = db.addMediaAsset({
        name: name || req.file.originalname,
        type: (type as 'sticker' | 'sound' | 'video') || 'sticker',
        url: fileUrl,
        duration: duration ? Number(duration) : undefined,
        volume: volume ? Number(volume) : 0.8,
        enabled: true,
      });

      auditLogService.log({
        adminId: req.admin!.id,
        action: 'UPLOAD_MEDIA_ASSET',
        targetId: media.id,
        metadata: { name: media.name, type: media.type, url: media.url, size: req.file.size },
      });

      res.status(201).json(media);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/admin/media/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const updated = db.updateMediaAsset(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Media asset not found' });

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'UPDATE_MEDIA_ASSET',
      targetId: updated.id,
      metadata: { name: updated.name, type: updated.type, changes: Object.keys(req.body) },
    });

    res.json(updated);
  });

  app.delete('/api/admin/media/:id', requireAdminAuth, (req: AuthenticatedRequest, res) => {
    const existing = db.getMediaAssetById(req.params.id);
    db.deleteMediaAsset(req.params.id);

    auditLogService.log({
      adminId: req.admin!.id,
      action: 'DELETE_MEDIA_ASSET',
      targetId: req.params.id,
      metadata: { name: existing?.name || req.params.id, type: existing?.type },
    });

    res.json({ success: true });
  });

  // --- 404 CATCH-ALL FOR UNMATCHED API ROUTES ---
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OBS Live Donation System] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
