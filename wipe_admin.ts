import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI;
const AdminSchema = new mongoose.Schema({ id: { type: String, required: true } }, { strict: false });
const AdminModel = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function run() {
  if (!mongoUri) {
    return;
  }
  
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const aRes = await AdminModel.deleteMany({});
  console.log(`Deleted ${aRes.deletedCount} admins`);

  await mongoose.disconnect();
}

run().catch(console.error);
