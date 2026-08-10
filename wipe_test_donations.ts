import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI;

const DonationSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });
const DonationEventSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });

const DonationModel = mongoose.models.Donation || mongoose.model('Donation', DonationSchema);
const DonationEventModel = mongoose.models.DonationEvent || mongoose.model('DonationEvent', DonationEventSchema);

async function run() {
  if (!mongoUri) {
    return;
  }
  
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const dRes = await DonationModel.deleteMany({ id: { $regex: '^don-test-' } });
  console.log(`Deleted ${dRes.deletedCount} test donations`);

  const eRes = await DonationEventModel.deleteMany({ donationId: { $regex: '^don-test-' } });
  console.log(`Deleted ${eRes.deletedCount} test donation events`);

  await mongoose.disconnect();
}

run().catch(console.error);
