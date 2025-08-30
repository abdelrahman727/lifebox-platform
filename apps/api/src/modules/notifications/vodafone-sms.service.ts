// src/modules/notifications/vodafone-sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface VodafoneSmsOptions {
  to: string;
  message: string;
  from?: string;
}

interface VodafoneApiConfig {
  username: string;
  password: string;
  customerID: string;
  senderAddress: string;
  baseUrl: string;
  notifyUrl?: string;
}

interface VodafoneSmsResponse {
  requestId?: string;
  status?: string;
  error?: string;
  resourceURL?: string;
}

@Injectable()
export class VodafoneSmsService {
  private readonly logger = new Logger(VodafoneSmsService.name);
  private httpClient: AxiosInstance;
  private config: VodafoneApiConfig;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeVodafoneApi();
  }

  private initializeVodafoneApi() {
    const username = this.configService.get<string>('VODAFONE_SMS_USERNAME');
    const password = this.configService.get<string>('VODAFONE_SMS_PASSWORD');
    const customerID = this.configService.get<string>('VODAFONE_SMS_CUSTOMER_ID');
    const senderAddress = this.configService.get<string>('VODAFONE_SMS_SENDER_ADDRESS');
    const baseUrl = this.configService.get<string>('VODAFONE_SMS_BASE_URL') || 'https://api.messaging.vodafone.com';
    const notifyUrl = this.configService.get<string>('VODAFONE_SMS_NOTIFY_URL');

    if (!username || !password || !customerID || !senderAddress) {
      this.logger.warn('Vodafone SMS service not configured. Required environment variables missing.');
      this.logger.warn('Required: VODAFONE_SMS_USERNAME, VODAFONE_SMS_PASSWORD, VODAFONE_SMS_CUSTOMER_ID, VODAFONE_SMS_SENDER_ADDRESS');
      return;
    }

    this.config = {
      username,
      password,
      customerID,
      senderAddress,
      baseUrl,
      notifyUrl,
    };

    // Create HTTP client with basic authentication
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
    });

    this.isConfigured = true;
    this.logger.log('Vodafone SMS service initialized');
  }

  async sendSms(options: VodafoneSmsOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('SMS not sent - Vodafone service not configured');
      return false;
    }

    try {
      // Format Egyptian phone numbers for Vodafone
      const phoneNumber = this.formatPhoneNumber(options.to);

      const requestBody = {
        address: phoneNumber,
        message: options.message,
        senderAddress: options.from || this.config.senderAddress,
        customerID: this.config.customerID,
        ...(this.config.notifyUrl && { notifyURL: this.config.notifyUrl }),
      };

      this.logger.debug('Sending SMS via Vodafone API', {
        to: phoneNumber,
        from: requestBody.senderAddress,
        customerID: this.config.customerID,
      });

      const response = await this.httpClient.post('/smsmessaging/v1/outbound/messages', requestBody);

      if (response.status === 201 || response.status === 200) {
        const responseData: VodafoneSmsResponse = response.data;
        this.logger.log(`SMS sent successfully via Vodafone: ${responseData.requestId || 'no-id'}`);
        return true;
      } else {
        this.logger.error(`Unexpected response from Vodafone SMS API: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to send SMS via Vodafone:', this.getErrorMessage(error));
      return false;
    }
  }

  /**
   * Format phone number for Vodafone API (Egyptian numbers)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, hyphens, or other characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Handle Egyptian mobile numbers
    if (cleaned.startsWith('01')) {
      // Egyptian mobile starting with 01 -> +201
      return `+2${cleaned}`;
    } else if (cleaned.startsWith('201')) {
      // Already formatted as 201 -> +201
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+201')) {
      // Already properly formatted
      return cleaned;
    } else if (cleaned.startsWith('+')) {
      // International format, assume it's correct
      return cleaned;
    } else {
      // Default: assume Egyptian and add +20
      return `+20${cleaned}`;
    }
  }

  /**
   * Send bulk SMS with rate limiting for Vodafone
   */
  async sendBulkSms(messages: VodafoneSmsOptions[], delayMs: number = 1000): Promise<void> {
    this.logger.log(`Sending ${messages.length} SMS messages via Vodafone with ${delayMs}ms delay`);

    for (let i = 0; i < messages.length; i++) {
      const sms = messages[i];
      await this.sendSms(sms);

      // Add delay between messages to respect rate limits
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Send templated SMS using Vodafone
   */
  async sendTemplatedSms(
    to: string,
    template: 'low_credit' | 'payment_received' | 'device_offline' | 'critical_alert' | 'otp',
    data: any,
  ): Promise<boolean> {
    const templates = {
      low_credit: `LifeBox: رصيدك منخفض! الرصيد: ${data.balance} جنيه. ادفع عبر فودافون كاش (${data.paymentCode}).`,
      payment_received: `LifeBox: تم استلام الدفعة! المبلغ: ${data.amount} جنيه. الرصيد الجديد: ${data.newBalance} جنيه.`,
      device_offline: `LifeBox تنبيه: الجهاز ${data.deviceCode} غير متصل. يرجى فحص الاتصال.`,
      critical_alert: `LifeBox عاجل: ${data.message}`,
      otp: `LifeBox: رمز التحقق الخاص بك: ${data.code}. صالح لمدة ${data.expiryMinutes || 5} دقائق.`,
    };

    const message = templates[template];
    if (!message) {
      this.logger.error(`SMS template ${template} not found`);
      return false;
    }

    return this.sendSms({ to, message });
  }

  /**
   * Check SMS delivery status (if supported by Vodafone API)
   */
  async checkDeliveryStatus(requestId: string): Promise<any> {
    if (!this.isConfigured) {
      this.logger.warn('Cannot check delivery status - Vodafone service not configured');
      return null;
    }

    try {
      const response = await this.httpClient.get(`/smsmessaging/v1/outbound/messages/${requestId}/deliveryStatus`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check delivery status for ${requestId}:`, this.getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get account balance/credits (if supported by Vodafone API)
   */
  async getAccountBalance(): Promise<any> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const response = await this.httpClient.get('/account/balance');
      return response.data;
    } catch (error) {
      this.logger.warn('Account balance check not available:', this.getErrorMessage(error));
      return null;
    }
  }

  /**
   * Test SMS service connectivity
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // Try to get account info or send a test message
      const testNumber = '+201000000000'; // Dummy number for connection test
      const result = await this.sendSms({
        to: testNumber,
        message: 'LifeBox SMS Service Test - Please ignore',
      });
      
      return result;
    } catch (error) {
      this.logger.error('SMS service connection test failed:', this.getErrorMessage(error));
      return false;
    }
  }

  private getErrorMessage(error: any): string {
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
    } else if (error.request) {
      return 'No response from Vodafone SMS API';
    } else {
      return error.message || 'Unknown error';
    }
  }

  /**
   * Get service configuration info (for debugging)
   */
  getServiceInfo() {
    return {
      provider: 'Vodafone SMS Messaging Hub',
      configured: this.isConfigured,
      baseUrl: this.config?.baseUrl,
      customerID: this.config?.customerID,
      senderAddress: this.config?.senderAddress,
      notifyUrl: this.config?.notifyUrl,
    };
  }
}