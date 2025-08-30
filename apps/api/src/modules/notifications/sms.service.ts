// src/modules/notifications/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

interface SmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: twilio.Twilio;
  private fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn('SMS service not configured. SMS messages will not be sent.');
      return;
    }

    try {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('SMS service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SMS service:', error);
    }
  }

  async sendSms(options: SmsOptions): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.warn('SMS not sent - service not configured');
      return false;
    }

    try {
      // Format Egyptian phone numbers if needed
      let phoneNumber = options.to;
      if (phoneNumber.startsWith('01')) {
        phoneNumber = `+2${phoneNumber}`;
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+${phoneNumber}`;
      }

      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      this.logger.log(`SMS sent successfully: ${message.sid}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send bulk SMS with rate limiting
   */
  async sendBulkSms(messages: SmsOptions[], delayMs: number = 500): Promise<void> {
    for (const sms of messages) {
      await this.sendSms(sms);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Send templated SMS
   */
  async sendTemplatedSms(
    to: string,
    template: 'low_credit' | 'payment_received' | 'device_offline' | 'critical_alert',
    data: any,
  ): Promise<boolean> {
    const templates = {
      low_credit: `LifeBox: Low credit! Balance: ${data.balance} EGP. Top up via Fawry (${data.fawryCode}).`,
      payment_received: `LifeBox: Payment received! Amount: ${data.amount} EGP. New balance: ${data.newBalance} EGP.`,
      device_offline: `LifeBox Alert: Device ${data.deviceCode} is offline. Please check connection.`,
      critical_alert: `LifeBox URGENT: ${data.message}`,
    };

    const message = templates[template];
    if (!message) {
      this.logger.error(`SMS template ${template} not found`);
      return false;
    }

    return this.sendSms({ to, message });
  }
}