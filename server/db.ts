import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AdminUser,
  Donation,
  DonationEvent,
  DonationItem,
  MediaAsset,
  PaymentMethod,
  AuditLog,
  TelegramSettings,
  SystemSettings,
} from '../src/types';
import {
  AdminModel,
  PaymentMethodModel,
  DonationItemModel,
  MediaAssetModel,
  DonationModel,
  DonationEventModel,
  AuditLogModel,
  TelegramSettingsModel,
  SystemSettingsModel,
} from './models';

// Helper for hashing password (sha256 with salt)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'obs_donation_salt_2026').digest('hex');
}

const initialAdmins = [
  {
    id: 'admin-1',
    username: process.env.ADMIN_USERNAME || 'admin',
    email: 'admin@liveobs.com',
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'),
    role: 'owner',
  },
];

const initialPaymentMethods: PaymentMethod[] = [];

const initialDonationItems: DonationItem[] = [];

const initialMediaAssets: MediaAsset[] = [];

const initialTelegramSettings: TelegramSettings = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  adminIds: (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  webhookUrl: '',
  isWebhookActive: false,
};

class MongoDatabase {
  private cache = {
    admins: initialAdmins as (AdminUser & { passwordHash: string })[],
    payment_methods: [...initialPaymentMethods],
    donation_items: [...initialDonationItems],
    media_assets: [...initialMediaAssets],
    donations: [] as Donation[],
    donation_events: [] as DonationEvent[],
    audit_logs: [] as AuditLog[],
    telegram_settings: { ...initialTelegramSettings },
    system_settings: { defaultSoundId: '' } as SystemSettings,
  };

  private isConnected = false;
  private backupFilePath = path.join(process.cwd(), 'uploads', 'db_backup.json');

  constructor() {
    this.loadFromLocalBackup();
    this.connect();
  }

  private loadFromLocalBackup() {
    try {
      if (fs.existsSync(this.backupFilePath)) {
        const raw = fs.readFileSync(this.backupFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (Array.isArray(data.admins) && data.admins.length > 0) this.cache.admins = data.admins;
          if (Array.isArray(data.payment_methods)) this.cache.payment_methods = data.payment_methods;
          if (Array.isArray(data.donation_items)) this.cache.donation_items = data.donation_items;
          if (Array.isArray(data.media_assets)) this.cache.media_assets = data.media_assets;
          if (Array.isArray(data.donations)) this.cache.donations = data.donations;
          if (Array.isArray(data.donation_events)) this.cache.donation_events = data.donation_events;
          if (Array.isArray(data.audit_logs)) this.cache.audit_logs = data.audit_logs;
          if (data.telegram_settings) this.cache.telegram_settings = { ...this.cache.telegram_settings, ...data.telegram_settings };
          if (data.system_settings) this.cache.system_settings = { ...this.cache.system_settings, ...data.system_settings };
          console.log('[Database] Restored state from local disk backup');
        }
      }
    } catch (e) {
      console.error('[Database] Error loading local backup:', e);
    }
  }

  private saveToLocalBackup() {
    try {
      const dir = path.dirname(this.backupFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.backupFilePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database] Error saving local backup:', e);
    }
  }

  private async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/obs_donation_db';
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`[MongoDB] Connected successfully to ${mongoUri}`);
      }
      this.isConnected = true;
      await this.seedAndLoadFromMongoDB();
    } catch (err: any) {
      console.warn(`[MongoDB] Could not connect directly to MongoDB at ${mongoUri}. Operating with MongoDB state cache:`, err?.message || err);
      this.isConnected = false;
    }
  }

  private async seedAndLoadFromMongoDB() {
    if (!this.isConnected) return;
    try {
      // Admins
      const adminCount = await AdminModel.countDocuments();
      if (adminCount === 0) {
        await AdminModel.insertMany(initialAdmins as any);
      } else {
        const docs: any[] = await AdminModel.find().lean();
        this.cache.admins = docs.map((d) => ({
          id: d.id,
          username: d.username,
          email: d.email,
          passwordHash: d.passwordHash,
          role: d.role,
        }));
      }

    

  // Payment Methods
      const pmCount = await PaymentMethodModel.countDocuments();
      if (pmCount === 0) {
        await PaymentMethodModel.insertMany(initialPaymentMethods as any);
      } else {
        const docs: any[] = await PaymentMethodModel.find().lean();
        this.cache.payment_methods = docs.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          accountName: d.accountName,
          accountNumber: d.accountNumber,
          phone: d.phone,
          qrCodeUrl: d.qrCodeUrl,
          instructions: d.instructions,
          enabled: d.enabled,
          sortOrder: d.sortOrder,
        }));
      }

      // Donation Items
      const itemCount = await DonationItemModel.countDocuments();
      if (itemCount === 0) {
        await DonationItemModel.insertMany(initialDonationItems as any);
      } else {
        const docs: any[] = await DonationItemModel.find().lean();
        this.cache.donation_items = docs.map((d) => ({
          id: d.id,
          name: d.name,
          price: d.price,
          currency: d.currency,
          description: d.description,
          stickerId: d.stickerId,
          soundId: d.soundId,
          videoId: d.videoId,
          displayDuration: d.displayDuration,
          enabled: d.enabled,
          sortOrder: d.sortOrder,
        }));
      }

      // Media Assets
      const mediaCount = await MediaAssetModel.countDocuments();
      if (mediaCount === 0) {
        await MediaAssetModel.insertMany(initialMediaAssets as any);
      } else {
        const docs: any[] = await MediaAssetModel.find().lean();
        this.cache.media_assets = docs.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type as any,
          url: d.url,
          duration: d.duration,
          volume: d.volume,
          enabled: d.enabled,
          createdAt: d.createdAt,
        }));
      }

      // Donations
      const donations: any[] = await DonationModel.find().lean();
      if (donations.length > 0) {
        this.cache.donations = donations.map((d) => ({
          id: d.id,
          publicId: d.publicId,
          donorName: d.donorName,
          amount: d.amount,
          currency: d.currency,
          paymentMethodId: d.paymentMethodId,
          paymentMethodName: d.paymentMethodName,
          donationItemId: d.donationItemId,
          donationItemName: d.donationItemName,
          transactionRef: d.transactionRef,
          slipUrl: d.slipUrl,
          message: d.message,
          status: d.status as any,
          createdAt: d.createdAt,
          approvedAt: d.approvedAt,
          approvedBy: d.approvedBy,
          declinedAt: d.declinedAt,
          declinedBy: d.declinedBy,
        }));
      }

      // Donation Events
      const events: any[] = await DonationEventModel.find().lean();
      if (events.length > 0) {
        this.cache.donation_events = events.map((e) => ({
          id: e.id,
          donationId: e.donationId,
          eventType: e.eventType as any,
          eventId: e.eventId,
          payload: e.payload,
          processed: e.processed,
          createdAt: e.createdAt,
        }));
      }

      // Audit Logs
      const logs: any[] = await AuditLogModel.find().lean();
      if (logs.length > 0) {
        this.cache.audit_logs = logs.map((l) => ({
          id: l.id,
          adminId: l.adminId,
          telegramUserId: l.telegramUserId,
          action: l.action,
          targetId: l.targetId,
          timestamp: l.timestamp,
          metadata: l.metadata,
        }));
      }

      // Telegram Settings
      const tgSettings: any = await TelegramSettingsModel.findOne().lean();
      if (tgSettings) {
        this.cache.telegram_settings = {
          botToken: tgSettings.botToken,
          adminIds: tgSettings.adminIds,
          webhookUrl: tgSettings.webhookUrl,
          isWebhookActive: tgSettings.isWebhookActive,
        };
      }

      // System Settings
      const sysSettings: any = await SystemSettingsModel.findOne().lean();
      if (sysSettings) {
        this.cache.system_settings = {
          defaultSoundId: sysSettings.defaultSoundId,
          themeConfig: sysSettings.themeConfig || {
            fontFamily: 'Inter',
            backgroundColor: 'transparent',
            animationSpeed: 1,
          }
        };
      } else {
        await TelegramSettingsModel.create(initialTelegramSettings as any);
      }
    } catch (err) {
      console.error('[MongoDB] Error loading initial collections from MongoDB:', err);
    }
  }

  // --- ADMINS ---
  getAdmins() {
    return this.cache.admins;
  }

  getAdminByUsername(username: string) {
    return this.cache.admins.find((a) => a.username.toLowerCase() === username.toLowerCase());
  }

  getAdminById(id: string) {
    return this.cache.admins.find((a) => a.id === id);
  }

  updateAdminPassword(adminId: string, newHash: string) {
    const admin = this.getAdminById(adminId);
    if (admin) {
      admin.passwordHash = newHash;
      if (this.isConnected) {
        (AdminModel as any).updateOne({ id: adminId }, { passwordHash: newHash }).catch((err: any) =>
          console.error('[MongoDB] Admin update error:', err)
        );
      }
      return true;
    }
    return false;
  }

  // --- PAYMENT METHODS ---
  getPaymentMethods(includeDisabled = false) {
    return this.cache.payment_methods
      .filter((pm) => includeDisabled || pm.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getPaymentMethodById(id: string) {
    return this.cache.payment_methods.find((pm) => pm.id === id);
  }

  addPaymentMethod(pm: Omit<PaymentMethod, 'id'>) {
    const newPm: PaymentMethod = {
      ...pm,
      id: 'pm-' + Date.now(),
    };
    this.cache.payment_methods.push(newPm);
    if (this.isConnected) {
      (PaymentMethodModel as any).create(newPm).catch((err: any) => console.error('[MongoDB] PaymentMethod create error:', err));
    }
    return newPm;
  }

  updatePaymentMethod(id: string, updates: Partial<PaymentMethod>) {
    const index = this.cache.payment_methods.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.cache.payment_methods[index] = { ...this.cache.payment_methods[index], ...updates };
      if (this.isConnected) {
        (PaymentMethodModel as any).updateOne({ id }, updates).catch((err: any) =>
          console.error('[MongoDB] PaymentMethod update error:', err)
        );
      }
      return this.cache.payment_methods[index];
    }
    return null;
  }

  deletePaymentMethod(id: string) {
    this.cache.payment_methods = this.cache.payment_methods.filter((p) => p.id !== id);
    if (this.isConnected) {
      (PaymentMethodModel as any).deleteOne({ id }).catch((err: any) => console.error('[MongoDB] PaymentMethod delete error:', err));
    }
  }

  // --- DONATION ITEMS ---
  getDonationItems(includeDisabled = false) {
    return this.cache.donation_items
      .filter((di) => includeDisabled || di.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getDonationItemById(id: string) {
    return this.cache.donation_items.find((di) => di.id === id);
  }

  addDonationItem(item: Omit<DonationItem, 'id'>) {
    const newItem: DonationItem = {
      ...item,
      id: 'item-' + Date.now(),
    };
    this.cache.donation_items.push(newItem);
    if (this.isConnected) {
      (DonationItemModel as any).create(newItem).catch((err: any) => console.error('[MongoDB] DonationItem create error:', err));
    }
    return newItem;
  }

  updateDonationItem(id: string, updates: Partial<DonationItem>) {
    const index = this.cache.donation_items.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.cache.donation_items[index] = { ...this.cache.donation_items[index], ...updates };
      if (this.isConnected) {
        (DonationItemModel as any).updateOne({ id }, updates).catch((err: any) =>
          console.error('[MongoDB] DonationItem update error:', err)
        );
      }
      return this.cache.donation_items[index];
    }
    return null;
  }

  deleteDonationItem(id: string) {
    this.cache.donation_items = this.cache.donation_items.filter((i) => i.id !== id);
    if (this.isConnected) {
      (DonationItemModel as any).deleteOne({ id }).catch((err: any) => console.error('[MongoDB] DonationItem delete error:', err));
    }
  }

  // --- MEDIA ASSETS ---
  getMediaAssets(type?: string) {
    if (type) {
      return this.cache.media_assets.filter((m) => m.type === type);
    }
    return this.cache.media_assets;
  }

  getMediaAssetById(id: string) {
    return this.cache.media_assets.find((m) => m.id === id);
  }

  addMediaAsset(media: Omit<MediaAsset, 'id' | 'createdAt'>) {
    const newMedia: MediaAsset = {
      ...media,
      id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    };
    this.cache.media_assets.push(newMedia);
    if (this.isConnected) {
      (MediaAssetModel as any).create(newMedia).catch((err: any) => console.error('[MongoDB] MediaAsset create error:', err));
    }
    return newMedia;
  }

  deleteMediaAsset(id: string) {
    this.cache.media_assets = this.cache.media_assets.filter((m) => m.id !== id);
    if (this.isConnected) {
      (MediaAssetModel as any).deleteOne({ id }).catch((err: any) => console.error('[MongoDB] MediaAsset delete error:', err));
    }
  }

  updateMediaAsset(id: string, updates: Partial<MediaAsset>) {
    const index = this.cache.media_assets.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.cache.media_assets[index] = { ...this.cache.media_assets[index], ...updates };
      if (this.isConnected) {
        (MediaAssetModel as any).updateOne({ id }, updates).catch((err: any) =>
          console.error('[MongoDB] MediaAsset update error:', err)
        );
      }
      return this.cache.media_assets[index];
    }
    return null;
  }

  // --- DONATIONS ---
  getDonations(statusFilter?: string) {
    if (statusFilter && statusFilter !== 'ALL') {
      return this.cache.donations
        .filter((d) => d.status === statusFilter)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.cache.donations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  clearDonationHistory() {
    this.cache.donations = this.cache.donations.filter(d => d.status === 'PENDING');
    if (this.isConnected) {
      DonationModel.deleteMany({ status: { $in: ['APPROVED', 'DECLINED'] } }).catch((err: any) => console.error('[MongoDB] Donation history clear error:', err));
    }
  }

  getDonationById(id: string) {
    return this.cache.donations.find((d) => d.id === id || d.publicId === id);
  }

  createDonation(
    donationData: Omit<Donation, 'id' | 'publicId' | 'status' | 'createdAt'>
  ): Donation {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.cache.donations.length + 1;
    const publicId = `DON-${dateStr}-${String(count).padStart(4, '0')}`;
    const id = 'don-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

    const pm = donationData.paymentMethodId
      ? this.getPaymentMethodById(donationData.paymentMethodId)
      : undefined;
    const item = donationData.donationItemId
      ? this.getDonationItemById(donationData.donationItemId)
      : undefined;

    const donation: Donation = {
      ...donationData,
      id,
      publicId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      paymentMethodName: pm ? pm.name : undefined,
      donationItemName: item ? item.name : undefined,
    };

    this.cache.donations.push(donation);
    this.saveToLocalBackup();
    if (this.isConnected) {
      (DonationModel as any).create(donation).catch((err: any) => console.error('[MongoDB] Donation create error:', err));
    }
    return donation;
  }

  updateDonationStatus(
    id: string,
    status: 'APPROVED' | 'DECLINED',
    actor: { adminId?: string; telegramUserId?: string }
  ): Donation | null {
    const donation = this.getDonationById(id);
    if (!donation) return null;

    if (donation.status !== 'PENDING') {
      console.warn(`Donation ${id} is already in state ${donation.status}`);
      return donation;
    }

    donation.status = status;
    const now = new Date().toISOString();
    const updateObj: any = { status };
    if (status === 'APPROVED') {
      donation.approvedAt = now;
      donation.approvedBy = actor.telegramUserId
        ? `Telegram:${actor.telegramUserId}`
        : actor.adminId || 'Admin';
      updateObj.approvedAt = now;
      updateObj.approvedBy = donation.approvedBy;
    } else {
      donation.declinedAt = now;
      donation.declinedBy = actor.telegramUserId
        ? `Telegram:${actor.telegramUserId}`
        : actor.adminId || 'Admin';
      updateObj.declinedAt = now;
      updateObj.declinedBy = donation.declinedBy;
    }

    this.saveToLocalBackup();
    if (this.isConnected) {
      (DonationModel as any).updateOne({ id: donation.id }, updateObj).catch((err: any) =>
        console.error('[MongoDB] Donation update error:', err)
      );
    }

    return donation;
  }

  // --- DONATION EVENTS (OBS OVERLAY QUEUE) ---
  addDonationEvent(donation: Donation): DonationEvent {
    const item = donation.donationItemId
      ? this.getDonationItemById(donation.donationItemId)
      : undefined;
    const sticker = item?.stickerId ? this.getMediaAssetById(item.stickerId) : undefined;
    const sound = item?.soundId ? this.getMediaAssetById(item.soundId) : undefined;
    const video = item?.videoId ? this.getMediaAssetById(item.videoId) : undefined;

    const eventId = `EVT-${donation.publicId}-${Date.now()}`;
    const event: DonationEvent = {
      id: 'evt-' + Date.now(),
      donationId: donation.id,
      eventType: 'DONATION_APPROVED',
      eventId,
      payload: {
        donation,
        item,
        sticker,
        sound,
        video,
      },
      processed: false,
      createdAt: new Date().toISOString(),
    };

    this.cache.donation_events.push(event);
    if (this.isConnected) {
      (DonationEventModel as any).create(event).catch((err: any) => console.error('[MongoDB] DonationEvent create error:', err));
    }
    return event;
  }

  getUnprocessedEvents(): DonationEvent[] {
    return this.cache.donation_events.filter((e) => !e.processed);
  }

  markEventProcessed(eventId: string) {
    const evt = this.cache.donation_events.find((e) => e.eventId === eventId || e.id === eventId);
    if (evt) {
      evt.processed = true;
      if (this.isConnected) {
        (DonationEventModel as any).updateOne({ $or: [{ eventId }, { id: eventId }] }, { processed: true }).catch((err: any) =>
          console.error('[MongoDB] DonationEvent markProcessed error:', err)
        );
      }
    }
  }


  // --- SYSTEM SETTINGS ---
  getSystemSettings(): SystemSettings {
    return this.cache.system_settings;
  }
  updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.cache.system_settings = { ...this.cache.system_settings, ...updates };
    if (this.isConnected) {
      (SystemSettingsModel as any).updateOne({}, this.cache.system_settings, { upsert: true }).catch((err: any) =>
        console.error('[MongoDB] SystemSettings update error:', err)
      );
    }
    return this.cache.system_settings;
  }

  // --- TELEGRAM SETTINGS ---
  getTelegramSettings() {
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    const envAdminIds = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return {
      botToken: envToken || this.cache.telegram_settings.botToken,
      adminIds: envAdminIds.length > 0 ? envAdminIds : this.cache.telegram_settings.adminIds,
      webhookUrl: this.cache.telegram_settings.webhookUrl || '',
      isWebhookActive: this.cache.telegram_settings.isWebhookActive || false,
    };
  }
  updateTelegramSettings(settings: Partial<TelegramSettings>) {
    this.cache.telegram_settings = { ...this.cache.telegram_settings, ...settings };
    if (this.isConnected) {
      (TelegramSettingsModel as any).updateOne({}, this.cache.telegram_settings, { upsert: true }).catch((err: any) =>
        console.error('[MongoDB] TelegramSettings update error:', err)
      );
    }
    return this.cache.telegram_settings;
  }

  // --- AUDIT LOGS ---
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const auditLog: AuditLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
    };
    this.cache.audit_logs.push(auditLog);
    if (this.cache.audit_logs.length > 500) {
      this.cache.audit_logs = this.cache.audit_logs.slice(-500);
    }
    if (this.isConnected) {
      (AuditLogModel as any).create(auditLog).catch((err: any) => console.error('[MongoDB] AuditLog create error:', err));
    }
    return auditLog;
  }
  getAuditLogs() {
    return [...this.cache.audit_logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  clearAuditLogs() {
    this.cache.audit_logs = [];
    if (this.isConnected) {
      AuditLogModel.deleteMany({}).catch((err: any) => console.error('[MongoDB] AuditLog clear error:', err));
    }
  }
}

export const db = new MongoDatabase();
