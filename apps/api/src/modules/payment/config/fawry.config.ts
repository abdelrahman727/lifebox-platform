// src/modules/payment/config/fawry.config.ts
import { registerAs } from '@nestjs/config';

export interface FawryConfigOptions {
  baseUrl: string;
  merchantCode: string;
  securityKey: string;
  billTypeCode: string;
  skipSignatureValidation: boolean;
  timeout?: number;
  retries?: number;
  webhookUrl?: string;
  // Credit monitoring thresholds
  creditWarningThreshold: number;
  creditCriticalThreshold: number;
  creditMonitoringInterval: number;
}

export const fawryConfig = registerAs('fawry', (): FawryConfigOptions => ({
  baseUrl: process.env.FAWRY_BASE_URL || 'https://staging.fawrystaging.com/api/v1',
  merchantCode: process.env.FAWRY_MERCHANT_CODE || '',
  securityKey: process.env.FAWRY_SECURITY_KEY || '',
  billTypeCode: process.env.FAWRY_BILL_TYPE_CODE || 'LIFEBOX_CREDIT',
  skipSignatureValidation: process.env.FAWRY_SKIP_SIGNATURE_VALIDATION === 'true',
  timeout: parseInt(process.env.FAWRY_TIMEOUT || '30000', 10),
  retries: parseInt(process.env.FAWRY_RETRIES || '3', 10),
  webhookUrl: process.env.FAWRY_WEBHOOK_URL,
  // Credit monitoring configuration
  creditWarningThreshold: parseInt(process.env.CREDIT_WARNING_THRESHOLD || '20', 10),
  creditCriticalThreshold: parseInt(process.env.CREDIT_CRITICAL_THRESHOLD || '5', 10),
  creditMonitoringInterval: parseInt(process.env.CREDIT_MONITORING_INTERVAL || '5', 10),
}))