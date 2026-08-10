import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI;

const mockPaymentMethodIds = ['pm-1', 'pm-2', 'pm-3', 'pm-4'];
const mockDonationItemIds = ['item-1', 'item-2', 'item-3', 'item-4'];
const mockMediaAssetIds = ['media-sticker-1', 'media-sticker-2', 'media-sticker-3', 'media-sound-1', 'media-sound-2', 'media-sound-3', 'media-video-1'];
const mockAuditLogIds = ['log-1'];

// Schema definitions
const PaymentMethodSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });
const DonationItemSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });
const MediaAssetSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });
const AuditLogSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });

const PaymentMethodModel = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);
const DonationItemModel = mongoose.models.DonationItem || mongoose.model('DonationItem', DonationItemSchema);
const MediaAssetModel = mongoose.models.MediaAsset || mongoose.model('MediaAsset', MediaAssetSchema);
const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

async function run() {
  if (!mongoUri) {
    console.log("No MongoDB URI, skipping wipe.");
    return;
  }
  
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const pRes = await PaymentMethodModel.deleteMany({ id: { $in: mockPaymentMethodIds } });
  console.log(`Deleted ${pRes.deletedCount} mock payment methods`);

  const dRes = await DonationItemModel.deleteMany({ id: { $in: mockDonationItemIds } });
  console.log(`Deleted ${dRes.deletedCount} mock donation items`);

  const mRes = await MediaAssetModel.deleteMany({ id: { $in: mockMediaAssetIds } });
  console.log(`Deleted ${mRes.deletedCount} mock media assets`);

  const aRes = await AuditLogModel.deleteMany({ id: { $in: mockAuditLogIds } });
  console.log(`Deleted ${aRes.deletedCount} mock audit logs`);

  await mongoose.disconnect();
}

run().catch(console.error);
