import mongoose, { Schema } from 'mongoose';
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

// Admin Schema
const AdminSchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
});

// Payment Method Schema
const PaymentMethodSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  accountName: { type: String },
  accountNumber: { type: String },
  phone: { type: String },
  qrCodeUrl: { type: String },
  instructions: { type: String },
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 1 },
});

// Donation Item Schema
const DonationItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'MMK' },
  description: { type: String },
  stickerId: { type: String },
  soundId: { type: String },
  videoId: { type: String },
  isGreenScreen: { type: Boolean, default: false },
  displayDuration: { type: Number, default: 8 },
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 1 },
});

// Media Asset Schema
const MediaAssetSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['sticker', 'sound', 'video'] },
  url: { type: String, required: true },
  duration: { type: Number },
  volume: { type: Number },
  isGreenScreen: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

// Donation Schema
const DonationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  publicId: { type: String, required: true, unique: true },
  donorName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'MMK' },
  paymentMethodId: { type: String },
  paymentMethodName: { type: String },
  donationItemId: { type: String },
  donationItemName: { type: String },
  paymentReference: { type: String },
  paymentProofUrl: { type: String },
  transactionRef: { type: String },
  slipUrl: { type: String },
  message: { type: String },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'DECLINED'], default: 'PENDING' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  approvedAt: { type: String },
  approvedBy: { type: String },
  declinedAt: { type: String },
  declinedBy: { type: String },
});

// Donation Event Schema
const DonationEventSchema = new Schema({
  id: { type: String, required: true, unique: true },
  donationId: { type: String, required: true },
  eventType: { type: String, required: true },
  eventId: { type: String, required: true, unique: true },
  payload: { type: Schema.Types.Mixed },
  processed: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

// Audit Log Schema
const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  adminId: { type: String },
  telegramUserId: { type: String },
  action: { type: String, required: true },
  targetId: { type: String },
  timestamp: { type: String, default: () => new Date().toISOString() },
  metadata: { type: Schema.Types.Mixed },
});

// Telegram Settings Schema
const TelegramSettingsSchema = new Schema({
  botToken: { type: String, default: '' },
  adminIds: { type: [String], default: [] },
  webhookUrl: { type: String, default: '' },
  isWebhookActive: { type: Boolean, default: false },
});

// Cloudinary Settings Schema
const CloudinarySettingsSchema = new Schema({
  cloudName: { type: String, default: '' },
  apiKey: { type: String, default: '' },
  apiSecret: { type: String, default: '' },
  folder: { type: String, default: 'payment_proofs' },
  enabled: { type: Boolean, default: true },
});

// System Settings Schema
const SystemSettingsSchema = new Schema({
  defaultSoundId: { type: String, default: '' },
  themeConfig: {
    fontFamily: { type: String, default: 'Inter' },
    backgroundColor: { type: String, default: 'transparent' },
    animationSpeed: { type: Number, default: 1 },
  },
});

export const AdminModel = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
export const PaymentMethodModel = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);
export const DonationItemModel = mongoose.models.DonationItem || mongoose.model('DonationItem', DonationItemSchema);
export const MediaAssetModel = mongoose.models.MediaAsset || mongoose.model('MediaAsset', MediaAssetSchema);
export const DonationModel = mongoose.models.Donation || mongoose.model('Donation', DonationSchema);
export const DonationEventModel = mongoose.models.DonationEvent || mongoose.model('DonationEvent', DonationEventSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const TelegramSettingsModel = mongoose.models.TelegramSettings || mongoose.model('TelegramSettings', TelegramSettingsSchema);
export const CloudinarySettingsModel = mongoose.models.CloudinarySettings || mongoose.model('CloudinarySettings', CloudinarySettingsSchema);
export const SystemSettingsModel = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
