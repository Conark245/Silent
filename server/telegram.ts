import fs from 'fs';
import path from 'path';
import { db } from './db';
import { realtimeServer } from './realtime';
import { Donation } from '../src/types';

export async function sendTelegramNotification(donation: Donation) {
  const settings = db.getTelegramSettings();
  if (!settings.botToken || settings.adminIds.length === 0) {
    console.log(
      `[Telegram] Bot token or admin IDs not configured. Donation ${donation.publicId} created in PENDING state.`
    );
    return false;
  }

  const item = donation.donationItemId ? db.getDonationItemById(donation.donationItemId) : null;
  const pm = donation.paymentMethodId ? db.getPaymentMethodById(donation.paymentMethodId) : null;

  const text = `🔔 *NEW DONATION RECEIVED*

👤 *Donor:* ${escapeMarkdown(donation.donorName ? donation.donorName.trim() : 'Anonymous')}
💰 *Amount:* *${donation.amount.toLocaleString()} ${donation.currency}*
💳 *Payment:* ${escapeMarkdown(pm ? pm.name : donation.paymentMethodName || 'N/A')}
🔢 *Transaction ID:* \`${escapeMarkdown(donation.paymentReference || (donation as any).transactionRef || 'N/A')}\`
🎁 *Reward:* ${escapeMarkdown(item ? item.name : donation.donationItemName || 'Standard Donation')}
💬 *Message:* ${escapeMarkdown(donation.message ? donation.message.trim() : '(No message)')}
🆔 *Donation ID:* \`${donation.publicId}\``;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `approve:${donation.id}` },
        { text: '❌ DECLINE', callback_data: `decline:${donation.id}` },
      ],
    ],
  };

  const proofUrl = donation.paymentProofUrl || (donation as any).slipUrl;
  let sentCount = 0;
  const telegramMessages: Array<{ chatId: string | number; messageId: number; isPhoto?: boolean }> = [];

  for (const adminId of settings.adminIds) {
    try {
      let sentSuccess = false;
      let msgId: number | undefined;

      // Try sending photo if payment proof screenshot exists
      if (proofUrl) {
        // Case A: Base64 image
        if (proofUrl.startsWith('data:image/')) {
          try {
            const matches = proofUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = mimeType.split('/')[1] || 'png';
              const blob = new Blob([buffer], { type: mimeType });
              const formData = new FormData();
              formData.append('chat_id', adminId);
              formData.append('photo', blob, `proof.${ext}`);
              formData.append('caption', text);
              formData.append('parse_mode', 'Markdown');
              formData.append('reply_markup', JSON.stringify(inlineKeyboard));

              const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(15000),
              });
              const data = await res.json();
              if (data.ok) {
                sentSuccess = true;
                if (data.result && data.result.message_id) msgId = data.result.message_id;
                sentCount++;
              } else {
                console.warn(`[Telegram] sendPhoto via base64 failed for admin ${adminId}: ${data.description}`);
              }
            }
          } catch (e) {
            console.error(`[Telegram] sendPhoto base64 error for admin ${adminId}:`, e);
          }
        }

        // Case B: Public HTTP/HTTPS URL
        if (!sentSuccess && (proofUrl.startsWith('http://') || proofUrl.startsWith('https://'))) {
          try {
            const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminId,
                photo: proofUrl,
                caption: text,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard,
              }),
              signal: AbortSignal.timeout(15000),
            });
            const data = await res.json();
            if (data.ok) {
              sentSuccess = true;
              if (data.result && data.result.message_id) msgId = data.result.message_id;
              sentCount++;
            } else {
              console.warn(`[Telegram] sendPhoto via URL failed for admin ${adminId}: ${data.description}`);
            }
          } catch (e) {
            console.error(`[Telegram] sendPhoto URL error for admin ${adminId}:`, e);
          }
        }

        // Case C: Local disk file
        if (!sentSuccess && !proofUrl.startsWith('data:image/')) {
          const relPath = proofUrl.replace(/^\//, '');
          const localFilePath = path.join(process.cwd(), relPath);
          if (fs.existsSync(localFilePath)) {
            try {
              const fileBuffer = fs.readFileSync(localFilePath);
              const ext = path.extname(localFilePath).toLowerCase();
              let mimeType = 'image/png';
              if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
              else if (ext === '.webp') mimeType = 'image/webp';
              else if (ext === '.gif') mimeType = 'image/gif';

              const blob = new Blob([fileBuffer], { type: mimeType });
              const formData = new FormData();
              formData.append('chat_id', adminId);
              formData.append('photo', blob, path.basename(localFilePath));
              formData.append('caption', text);
              formData.append('parse_mode', 'Markdown');
              formData.append('reply_markup', JSON.stringify(inlineKeyboard));

              const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(15000),
              });
              const data = await res.json();
              if (data.ok) {
                sentSuccess = true;
                if (data.result && data.result.message_id) msgId = data.result.message_id;
                sentCount++;
              } else {
                console.error(`[Telegram] sendPhoto FormData error for admin ${adminId}:`, data.description);
              }
            } catch (e) {
              console.error(`[Telegram] sendPhoto local file error for admin ${adminId}:`, e);
            }
          } else if (settings.webhookUrl) {
            // Case D: Try constructing public URL if webhookUrl is present
            const fullUrl = `${settings.webhookUrl.replace(/\/$/, '')}/${relPath}`;
            try {
              const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: adminId,
                  photo: fullUrl,
                  caption: text,
                  parse_mode: 'Markdown',
                  reply_markup: inlineKeyboard,
                }),
                signal: AbortSignal.timeout(15000),
              });
              const data = await res.json();
              if (data.ok) {
                sentSuccess = true;
                if (data.result && data.result.message_id) msgId = data.result.message_id;
                sentCount++;
              }
            } catch (e) {
              // Ignore fallback error
            }
          }
        }
      }

      // Fallback to text message if sendPhoto failed or no photo provided
      if (!sentSuccess) {
        const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          }),
          signal: AbortSignal.timeout(15000),
        });

        const data = await res.json();
        if (data.ok) {
          if (data.result && data.result.message_id) msgId = data.result.message_id;
          sentCount++;
        } else {
          console.error(`[Telegram] Failed to send to admin ${adminId}:`, data.description);
        }
      }

      if (msgId) {
        telegramMessages.push({
          chatId: adminId,
          messageId: msgId,
          isPhoto: sentSuccess,
        });
      }
    } catch (err) {
      console.error(`[Telegram] Error sending notification to ${adminId}:`, err);
    }
  }

  if (telegramMessages.length > 0) {
    donation.telegramMessages = telegramMessages;
    db.updateDonationTelegramMessages(donation.id, telegramMessages);
  }

  return sentCount > 0;
}

export async function notifyTelegramDonationHandled(
  donation: Donation,
  status: 'APPROVED' | 'DECLINED',
  actorLabel: string
) {
  const settings = db.getTelegramSettings();
  if (!settings.botToken || !donation.telegramMessages || donation.telegramMessages.length === 0) {
    return;
  }

  const actionText = status === 'APPROVED' ? '✅ *STATUS: APPROVED*' : '❌ *STATUS: DECLINED*';
  const byText = `👤 *By:* ${escapeMarkdown(actorLabel)}`;
  const timeText = `⏰ *Time:* ${new Date().toLocaleTimeString()}`;

  for (const msgInfo of donation.telegramMessages) {
    try {
      const updatedText = `🔔 *DONATION ${status}*\n\n👤 *Donor:* ${escapeMarkdown(
        donation.donorName || 'Anonymous'
      )}\n💰 *Amount:* *${donation.amount.toLocaleString()} ${donation.currency}*\n🆔 *ID:* \`${
        donation.publicId
      }\`\n\n${actionText}\n${byText}\n${timeText}`;

      await editTelegramMessageOrCaption(
        settings.botToken,
        msgInfo.chatId,
        msgInfo.messageId,
        updatedText,
        Boolean(msgInfo.isPhoto)
      );
    } catch (err) {
      console.error(
        `[Telegram] Failed to update message ${msgInfo.messageId} for chat ${msgInfo.chatId}:`,
        err
      );
    }
  }
}

export async function sendTelegramTestMessage(botToken: string, adminIds: string[]) {
  const text = `🔔 *Test Message*
This is a test message to verify your Telegram Bot connection for DonationLive.
If you received this, your bot token and admin IDs are configured correctly!`;
  
  let sentCount = 0;
  for (const adminId of adminIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.ok) {
        sentCount++;
      } else {
        console.error(`[Telegram] Failed to send test message to admin ${adminId}:`, data.description);
        if (adminIds.length === 1) {
            throw new Error(data.description || 'Unknown Telegram API error');
        }
      }
    } catch (err: any) {
      console.error(`[Telegram] Error sending test message to ${adminId}:`, err);
      if (adminIds.length === 1) {
          throw err;
      }
    }
  }
  return sentCount;
}

export async function handleTelegramWebhook(body: any) {
  const settings = db.getTelegramSettings();

  // Check if callback_query exists
  if (body.callback_query) {
    const cb = body.callback_query;
    const userId = String(cb.from.id);
    const username = cb.from.username || cb.from.first_name || userId;
    const callbackData = cb.data as string; // e.g. "approve:don-123" or "decline:don-123"

    // Verify authorized admin ID (match numeric ID, handle, or @handle case-insensitively)
    const isAuthorized =
      settings.adminIds.length > 0 &&
      settings.adminIds.some((id) => {
        const cleanId = id.trim().toLowerCase().replace(/^@/, '');
        const cleanUser = String(username).toLowerCase().replace(/^@/, '');
        return (
          id.trim() === userId ||
          cleanId === userId ||
          (cleanUser && cleanId === cleanUser)
        );
      });

    if (!isAuthorized) {
      console.warn(`[Telegram] Unauthorized callback attempt from user ID ${userId} (${username})`);
      db.addAuditLog({
        telegramUserId: userId,
        action: 'TELEGRAM_UNAUTHORIZED_ATTEMPT',
        metadata: { username, callbackData },
      });
      if (settings.botToken && cb.id) {
        await answerCallbackQuery(
          settings.botToken,
          cb.id,
          '❌ Unauthorized: Your Telegram ID or username is not listed in Telegram Admin settings.'
        );
      }
      return { success: false, message: 'Unauthorized Telegram Admin ID' };
    }

    const [action, donationId] = callbackData.split(':');
    const donation = db.getDonationById(donationId);

    if (!donation) {
      if (settings.botToken && cb.id) {
        await answerCallbackQuery(settings.botToken, cb.id, '❌ Donation not found');
      }
      return { success: false, message: 'Donation not found' };
    }

    if (donation.status !== 'PENDING') {
      const msg = `⚠️ Donation ${donation.publicId} is already ${donation.status}`;
      if (settings.botToken && cb.id) {
        await answerCallbackQuery(settings.botToken, cb.id, msg);
      }
      return { success: false, message: msg };
    }

    const isPhotoMsg = Boolean(cb.message && cb.message.photo && cb.message.photo.length > 0);
    const baseText = cb.message ? (cb.message.caption || cb.message.text || '') : '';

    if (action === 'approve') {
      const updated = db.updateDonationStatus(donation.id, 'APPROVED', {
        telegramUserId: `${username} (${userId})`,
      });

      if (updated) {
        // Broadcast real-time events for OBS and Website
        const event = db.addDonationEvent(updated);
        realtimeServer.broadcastDonationEvent(event);
        realtimeServer.broadcastDonationStatus(updated);

        // Audit log
        db.addAuditLog({
          telegramUserId: userId,
          action: 'TELEGRAM_APPROVE_DONATION',
          targetId: updated.id,
          metadata: { publicId: updated.publicId, amount: updated.amount, adminUsername: username },
        });

        // Notify and update all admin Telegram messages across all chats
        const actorLabel = `@${username} (ID: ${userId})`;
        await notifyTelegramDonationHandled(updated, 'APPROVED', actorLabel);

        if (settings.botToken && cb.id) {
          await answerCallbackQuery(settings.botToken, cb.id, '✅ Donation APPROVED & Synced to Website!');
        }

        return { success: true, action: 'APPROVED', donation: updated };
      }
    } else if (action === 'decline') {
      const updated = db.updateDonationStatus(donation.id, 'DECLINED', {
        telegramUserId: `${username} (${userId})`,
      });

      if (updated) {
        // Broadcast status update for Website sync
        realtimeServer.broadcastDonationStatus(updated);

        db.addAuditLog({
          telegramUserId: userId,
          action: 'TELEGRAM_DECLINE_DONATION',
          targetId: updated.id,
          metadata: { publicId: updated.publicId, amount: updated.amount, adminUsername: username },
        });

        // Notify and update all admin Telegram messages across all chats
        const actorLabel = `@${username} (ID: ${userId})`;
        await notifyTelegramDonationHandled(updated, 'DECLINED', actorLabel);

        if (settings.botToken && cb.id) {
          await answerCallbackQuery(settings.botToken, cb.id, '❌ Donation DECLINED & Synced to Website');
        }

        return { success: true, action: 'DECLINED', donation: updated };
      }
    }
  }

  return { success: true, message: 'Webhook event processed' };
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[Telegram] Error answering callback query:', err);
  }
}

async function editTelegramMessageOrCaption(
  botToken: string,
  chatId: number | string,
  messageId: number,
  text: string,
  isPhoto: boolean = false
) {
  try {
    const endpoint = isPhoto ? 'editMessageCaption' : 'editMessageText';
    const bodyObj: any = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    };
    if (isPhoto) {
      bodyObj.caption = text;
    } else {
      bodyObj.text = text;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (!data.ok && !isPhoto) {
      // Fallback try editMessageCaption if editMessageText failed
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] },
        }),
        signal: AbortSignal.timeout(15000),
      });
    }
  } catch (err) {
    console.error('[Telegram] Error editing message or caption:', err);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*`\[\]]/g, '\\$&');
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const payload: any = { url: webhookUrl };
      const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
      if (secretToken) {
        payload.secret_token = secretToken;
      }
      
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`[Telegram] Webhook successfully set to ${webhookUrl}`);
        return true;
      } else {
        console.error(`[Telegram] Failed to set webhook (attempt ${attempt}):`, data.description);
        if (data.error_code === 429 && attempt < retries) {
          const retryAfter = data.parameters?.retry_after || 2;
          console.log(`[Telegram] Retrying in ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        return false;
      }
    } catch (err) {
      console.error(`[Telegram] Error setting webhook (attempt ${attempt}):`, err);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      return false;
    }
  }
  return false;
}
