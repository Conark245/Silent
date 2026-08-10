export type DonationStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED';

export type MediaType = 'sticker' | 'sound' | 'video';

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  accountName: string;
  accountNumber: string;
  phone?: string;
  qrImageUrl?: string;
  instructions?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface DonationItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
  stickerId?: string;
  soundId?: string;
  videoId?: string;
  displayDuration: number; // in seconds
  enabled: boolean;
  sortOrder: number;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration?: number; // duration in seconds
  volume?: number; // 0.0 - 1.0
  enabled: boolean;
  createdAt: string;
}

export interface Donation {
  id: string;
  publicId: string; // e.g. DON-20260810-0001
  donorName: string;
  amount: number;
  currency: string;
  message?: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  donationItemId?: string;
  donationItemName?: string;
  status: DonationStatus;
  createdAt: string;
  approvedAt?: string;
  declinedAt?: string;
  approvedBy?: string;
  declinedBy?: string;
}

export interface DonationEvent {
  id: string;
  donationId: string;
  eventType: 'DONATION_APPROVED';
  eventId: string;
  payload: {
    donation: Donation;
    item?: DonationItem;
    sticker?: MediaAsset;
    sound?: MediaAsset;
    video?: MediaAsset;
  };
  processed: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId?: string;
  telegramUserId?: string;
  action: string;
  targetId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TelegramSettings {
  botToken: string;
  adminIds: string[]; // e.g. ["123456789"]
  webhookUrl: string;
  isWebhookActive: boolean;
}

export interface SystemSettings {
  defaultSoundId?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role?: 'owner' | 'admin';
}
