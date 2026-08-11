import mongoose from 'mongoose';
import { DonationItemModel, MediaAssetModel } from './server/models.js';
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/obs-donation').then(async () => {
  const items = await DonationItemModel.find();
  const media = await MediaAssetModel.find();
  console.log('Items:', JSON.stringify(items, null, 2));
  console.log('Media:', JSON.stringify(media, null, 2));
  process.exit(0);
});
