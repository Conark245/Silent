import { db } from './db';
import { AuditLog } from '../src/types';

export type AuditActionType =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_CHANGE_PASSWORD'
  | 'ADMIN_CHANGE_PASSWORD_FAILED'
  | 'CREATE_PAYMENT_METHOD'
  | 'UPDATE_PAYMENT_METHOD'
  | 'DELETE_PAYMENT_METHOD'
  | 'CREATE_DONATION_ITEM'
  | 'UPDATE_DONATION_ITEM'
  | 'DELETE_DONATION_ITEM'
  | 'UPLOAD_MEDIA_ASSET'
  | 'UPDATE_MEDIA_ASSET'
  | 'DELETE_MEDIA_ASSET'
  | 'UPDATE_TELEGRAM_SETTINGS'
  | 'TELEGRAM_APPROVE_DONATION'
  | 'TELEGRAM_DECLINE_DONATION'
  | 'ADMIN_APPROVE_DONATION'
  | 'ADMIN_DECLINE_DONATION'
  | 'TRIGGER_PREVIEW_ALERT'
  | string;

export interface LogAuditParams {
  adminId?: string;
  telegramUserId?: string;
  action: AuditActionType;
  targetId?: string;
  metadata?: Record<string, any>;
}

export const auditLogService = {
  log(params: LogAuditParams): AuditLog {
    return db.addAuditLog({
      adminId: params.adminId,
      telegramUserId: params.telegramUserId,
      action: params.action,
      targetId: params.targetId,
      metadata: params.metadata,
    });
  },

  getLogs(): AuditLog[] {
    return db.getAuditLogs();
  },
};
