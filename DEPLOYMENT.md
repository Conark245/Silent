# 🚀 Deployment Guide (Render, Vercel & VPS)

ဤလမ်းညွှန်သည် ဤ Live Donation & OBS Alert System အပလီကေးရှင်းကို **Render**, **Vercel** နှင့် **VPS (Virtual Private Server / Docker / PM2)** တို့တွင် အလွယ်တကူ Deploy လုပ်နိုင်ရန် ရှင်းလင်းပြသထားပါသည်။

---

## 1. 🌐 Render မှာ Deploy လုပ်နည်း (Render.com)

Render တွင် Full-stack Node.js Web Service အဖြစ် တင်ရန် အလွန်လွယ်ကူပါသည်။

1. **GitHub** သို့မဟုတ် **GitLab** တွင် သင့် Project ကို Push လုပ်ပါ။
2. [Render Dashboard](https://dashboard.render.com/) သို့ဝင်ပြီး **New -> Web Service** ကို နှိပ်ပါ။
3. သင့် GitHub Repository ကို Connect လုပ်ပါ။
4. အောက်ပါအတိုင်း Settings များကို ဖြည့်ပါ:
   - **Name:** `live-donation-app` (သို့မဟုတ် အလိုရှိရာ)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free သို့မဟုတ် Paid
5. **Environment Variables** တွင် လိုအပ်သော Secrets များကို ထည့်ပါ (ဥပမာ - `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `CLOUDINARY_URL` စသည်ဖြင့်)။
6. **Create Web Service** ကို နှိပ်ပါ။ Render က `render.yaml` ကို အလိုအလျောက် အသုံးပြုပြီး Deploy လုပ်ပေးပါလိမ့်မည်။

---

## 2. ▲ Vercel မှာ Deploy လုပ်နည်း (Vercel.com)

Vercel တွင် Frontend (SPA) နှင့် Backend API Routes (`/api/*`) နှစ်ခုစလုံးကို Serverless Functions အဖြစ် ချောမွေ့စွာ Deploy လုပ်နိုင်ရန် `vercel.json` နှင့် `api/index.ts` တို့ကို ပြင်ဆင်ထားပြီး ဖြစ်ပါသည်။

1. [Vercel Dashboard](https://vercel.com/) သို့ဝင်ပြီး **Add New -> Project** ကို နှိပ်ပါ။
2. သင့် GitHub Repository ကို Import လုပ်ပါ။
3. **Configure Project** တွင်:
   - **Framework Preset:** `Vite` (သို့မဟုတ် အလိုအလျောက် Detect လုပ်ပါလိမ့်မည်)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** တွင် လိုအပ်သော Variable များကို ထည့်သွင်းပါ။
5. **Deploy** ကို နှိပ်ပါ။ Vercel သည် `vercel.json` နှင့် `api/index.ts` ကို အသုံးပြု၍ Serverless အနေဖြင့် တင်ပေးပါမည်။

---

## 3. 🖥️ VPS (Ubuntu/Linux) မှာ Deploy လုပ်နည်း

VPS (DigitalOcean, AWS EC2, Linode, Vultr စသည်) တွင် Docker သို့မဟုတ် PM2 ဖြင့် Deploy လုပ်နိုင်ပါသည်။

### နည်းလမ်း (က) - Docker & Docker Compose ဖြင့် တင်ခြင်း (အလွယ်ဆုံးနှင့် အကောင်းဆုံး)

1. VPS သို့ SSH ဖြင့် ဝင်ပါ:
   ```bash
   ssh root@your-vps-ip
   ```
2. Project ကို Clone လုပ်ပါ သို့မဟုတ် Upload တင်ပါ။
3. အောက်ပါ command ဖြင့် Docker Compose ကို Run ပါ:
   ```bash
   docker compose up -d --build
   ```
4. အပလီကေးရှင်းသည် `http://your-vps-ip:3000` တွင် အလုပ်လုပ်နေပါမည်။ (Nginx Reverse Proxy ဖြင့် Domain ချိတ်ဆက်နိုင်ပါသည်)

### နည်းလမ်း (ခ) - PM2 ဖြင့် တင်ခြင်း (Direct Node.js Process)

1. Node.js (v20+) နှင့် npm ကို VPS တွင် ထည့်သွင်းပါ။
2. Project ဖိုဒါထဲသို့ ဝင်ပြီး Dependencies များ Install လုပ်ပါ:
   ```bash
   npm install
   npm run build
   ```
3. PM2 ဖြင့် Start လုပ်ပါ (`ecosystem.config.js` ကို အသုံးပြုမည်):
   ```bash
   sudo npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

## 🔑 Environment Variables (.env)

အောက်ပါ Environment Variables များကို Hosting တစ်ခုချင်းစီ၏ Dashboard (Environment Variables tab) သို့မဟုတ် `.env` ဖိုင်တွင် ထည့်သွင်းပေးရပါမည်။

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=your_secure_password
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
