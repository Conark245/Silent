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

  const text = `🔔 *NEW DONATION*

👤 *Donor:*
${escapeMarkdown(donation.donorName)}

💰 *Amount:*
${donation.amount.toLocaleString()} ${donation.currency}

💳 *Payment:*
${escapeMarkdown(pm ? pm.name : donation.paymentMethodName || 'N/A')}

🎁 *Reward:*
${escapeMarkdown(item ? item.name : donation.donationItemName || 'Standard Donation')}

💬 *Message:*
${escapeMarkdown(donation.message || '(No message)')}

🆔 *Donation ID:*
\`${donation.publicId}\``;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `approve:${donation.id}` },
        { text: '❌ DECLINE', callback_data: `decline:${donation.id}` },
      ],
    ],
  };

  let sentCount = 0;
  for (const adminId of settings.adminIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        sentCount++;
      } else {
        console.error(`[Telegram] Failed to send to admin ${adminId}:`, data.description);
      }
    } catch (err) {
      console.error(`[Telegram] Error sending to ${adminId}:`, err);
    }
  }

  return sentCount > 0;
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

    // Verify authorized admin ID
    const isAuthorized =
      settings.adminIds.length === 0 || // If no admin IDs configured, allow fallback or require match
      settings.adminIds.includes(userId);

    if (!isAuthorized) {
      console.warn(`[Telegram] Unauthorized callback attempt from user ID ${userId}`);
      db.addAuditLog({
        telegramUserId: userId,
        action: 'TELEGRAM_UNAUTHORIZED_ATTEMPT',
        metadata: { username, callbackData },
      });
      if (settings.botToken && cb.id) {
        await answerCallbackQuery(
          settings.botToken,
          cb.id,
          '❌ Unauthorized: Your Telegram ID is not in TELEGRAM_ADMIN_IDS'
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

    if (action === 'approve') {
      const updated = db.updateDonationStatus(donation.id, 'APPROVED', {
        telegramUserId: `${username} (${userId})`,
      });

      if (updated) {
        // Trigger real-time event for OBS
        const event = db.addDonationEvent(updated);
        realtimeServer.broadcastDonationEvent(event);

        // Audit log
        db.addAuditLog({
          telegramUserId: userId,
          action: 'TELEGRAM_APPROVE_DONATION',
          targetId: updated.id,
          metadata: { publicId: updated.publicId, amount: updated.amount, adminUsername: username },
        });

        // Edit Telegram message
        if (settings.botToken && cb.message) {
          const updatedText =
            cb.message.text +
            `\n\n✅ *STATUS: APPROVED*\n👤 *Approved By:* Telegram Admin @${escapeMarkdown(
              username
            )} (ID: ${userId})\n⏰ *Time:* ${new Date().toLocaleTimeString()}`;
          await editTelegramMessage(
            settings.botToken,
            cb.message.chat.id,
            cb.message.message_id,
            updatedText
          );
          await answerCallbackQuery(settings.botToken, cb.id, '✅ Donation APPROVED & Broadcast to OBS!');
        }

        return { success: true, action: 'APPROVED', donation: updated };
      }
    } else if (action === 'decline') {
      const updated = db.updateDonationStatus(donation.id, 'DECLINED', {
        telegramUserId: `${username} (${userId})`,
      });

      if (updated) {
        db.addAuditLog({
          telegramUserId: userId,
          action: 'TELEGRAM_DECLINE_DONATION',
          targetId: updated.id,
          metadata: { publicId: updated.publicId, amount: updated.amount, adminUsername: username },
        });

        if (settings.botToken && cb.message) {
          const updatedText =
            cb.message.text +
            `\n\n❌ *STATUS: DECLINED*\n👤 *Declined By:* Telegram Admin @${escapeMarkdown(
              username
            )} (ID: ${userId})\n⏰ *Time:* ${new Date().toLocaleTimeString()}`;
          await editTelegramMessage(
            settings.botToken,
            cb.message.chat.id,
            cb.message.message_id,
            updatedText
          );
          await answerCallbackQuery(settings.botToken, cb.id, '❌ Donation DECLINED');
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
    });
  } catch (err) {
    console.error('[Telegram] Error answering callback query:', err);
  }
}

async function editTelegramMessage(
  botToken: string,
  chatId: number | string,
  messageId: number,
  text: string
) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }, // Remove buttons once decided
      }),
    });
  } catch (err) {
    console.error('[Telegram] Error editing message:', err);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*`\[\]]/g, '\\$&');
}
