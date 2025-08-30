// src/modules/notifications/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'Email service not configured. Emails will not be sent.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email service connection failed:', error);
      } else {
        this.logger.log('Email service ready');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email not sent - service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: `"LifeBox" <${this.configService.get<string>('SMTP_USER')}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : options.bcc
          : undefined,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(
    recipients: EmailOptions[],
    delayMs: number = 100,
  ): Promise<void> {
    for (const email of recipients) {
      await this.sendEmail(email);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(
    to: string,
    template:
      | 'low_credit'
      | 'payment_received'
      | 'device_offline'
      | 'monthly_report',
    data: any,
  ): Promise<boolean> {
    const templates = {
      low_credit: {
        subject: '⚠️ Low Credit Warning - LifeBox',
        html: this.getLowCreditTemplate(data),
      },
      payment_received: {
        subject: 'Payment Received - LifeBox',
        html: this.getPaymentReceivedTemplate(data),
      },
      device_offline: {
        subject: 'Device Offline Alert - LifeBox',
        html: this.getDeviceOfflineTemplate(data),
      },
      monthly_report: {
        subject: 'Monthly Report - LifeBox',
        html: this.getMonthlyReportTemplate(data),
      },
    };

    const selectedTemplate = templates[template];
    if (!selectedTemplate) {
      this.logger.error(`Template ${template} not found`);
      return false;
    }

    return this.sendEmail({
      to,
      subject: selectedTemplate.subject,
      html: selectedTemplate.html,
    });
  }

  private getLowCreditTemplate(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Low Credit Alert</h2>
        <p>Your current balance is <strong>${data.balance} EGP</strong></p>
        <p>Please top up to avoid service interruption.</p>
        <p>Fawry Payment Code: <strong>${data.fawryCode}</strong></p>
      </div>
    `;
  }

  private getPaymentReceivedTemplate(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Payment Received</h2>
        <p>We have received your payment of <strong>${data.amount} EGP</strong></p>
        <p>New Balance: <strong>${data.newBalance} EGP</strong></p>
        <p>Transaction ID: ${data.transactionId}</p>
      </div>
    `;
  }

  private getDeviceOfflineTemplate(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Device Offline Alert</h2>
        <p>Device <strong>${data.deviceCode}</strong> has been offline since ${data.offlineSince}</p>
        <p>Please check the device connection.</p>
      </div>
    `;
  }

  private getMonthlyReportTemplate(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Monthly Report - ${data.month}</h2>
        <p>Total Energy Consumed: <strong>${data.totalEnergy} kWh</strong></p>
        <p>Total Water Pumped: <strong>${data.totalWater} m³</strong></p>
        <p>Total Cost: <strong>${data.totalCost} EGP</strong></p>
        <p>CO2 Saved: <strong>${data.co2Saved} tons</strong></p>
      </div>
    `;
  }
}
