// src/modules/payment/services/credit-monitor.service.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeviceControlService } from './device-control.service';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';
import { SystemSettingsService } from './system-settings.service';
import { TemplateService } from './template.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CreditMonitorService {
  private readonly logger = new Logger(CreditMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DeviceControlService))
    private readonly deviceControlService: DeviceControlService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Monitor credit levels - runs based on configured interval
   * Interval is dynamically determined from system settings
   */
  @Cron(CronExpression.EVERY_5_MINUTES) // Default, will be overridden by system settings
  async monitorCreditLevels() {
    this.logger.log('Starting credit level monitoring');

    try {
      // Get current thresholds from system settings
      const [warningThreshold, criticalThreshold] = await Promise.all([
        this.systemSettingsService.getSetting('CREDIT_WARNING_THRESHOLD', 20),
        this.systemSettingsService.getSetting('CREDIT_CRITICAL_THRESHOLD', 5),
      ]);

      // Get all prepaid clients with low credit
      const lowCreditClients = await this.prisma.client.findMany({
        where: {
          billingType: 'prepaid',
          credit: {
            lte: warningThreshold,
          },
        },
        include: {
          devices: {
            where: {
              isActive: true,
            },
          },
          users: true,
        },
      });

      for (const client of lowCreditClients) {
        const creditLevel = Number(client.credit);

        if (creditLevel <= criticalThreshold) {
          // Critical level - shut down devices
          await this.handleCriticalCredit(client, criticalThreshold);
        } else if (creditLevel <= warningThreshold) {
          // Warning level - send notifications
          await this.handleLowCredit(client, warningThreshold);
        }
      }

      this.logger.log(`Monitored ${lowCreditClients.length} clients with low credit`);
    } catch (error) {
      this.logger.error('Credit monitoring failed', error);
    }
  }

  /**
   * Handle critical credit level (shut down devices)
   */
  private async handleCriticalCredit(client: any, criticalThreshold: number) {
    this.logger.warn(`Critical credit level for client ${client.name}: ${client.credit} EGP`);

    // Get cooldown period from settings
    const cooldownHours = await this.systemSettingsService.getSetting('NOTIFICATION_COOLDOWN_HOURS', 24);

    // Check if we already sent a critical alert recently
    const recentAlert = await this.prisma.notification.findFirst({
      where: {
        clientId: client.id,
        type: 'CRITICAL_CREDIT_SHUTDOWN',
        createdAt: {
          gte: new Date(Date.now() - cooldownHours * 60 * 60 * 1000),
        },
      },
    });

    if (!recentAlert && client.devices.length > 0) {
      // Shut down all client devices
      const shutdownResult = await this.deviceControlService.shutdownAllClientDevices(
        client.id,
        `Insufficient credit: ${client.credit} EGP`,
      );

      // Send critical notifications using templates
      await this.sendCriticalNotifications(client);

      // Get custom message template for notification
      const processedTemplate = await this.templateService.processTemplateForClient(
        'credit_critical',
        'email',
        client.id,
        undefined,
        {
          threshold: criticalThreshold,
          shutdownTime: new Date(),
          devicesAffected: client.devices.length,
        }
      );

      // Record the shutdown event
      await this.prisma.notification.create({
        data: {
          type: 'CRITICAL_CREDIT_SHUTDOWN',
          title: 'Devices Shut Down - No Credit',
          message: processedTemplate.content.replace(/<[^>]*>/g, ''), // Strip HTML for notification
          severity: 'critical',
          clientId: client.id,
          metadata: {
            creditBalance: Number(client.credit),
            threshold: criticalThreshold,
            shutdownResult,
            shutdownTime: new Date(),
          },
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          actionType: 'CREDIT_SHUTDOWN',
          resourceType: 'CLIENT',
          resourceId: client.id,
          details: {
            reason: 'Insufficient credit',
            balance: Number(client.credit),
            threshold: criticalThreshold,
            devicesAffected: client.devices.length,
            shutdownResult,
          },
          ipAddress: 'system',
          userAgent: 'CreditMonitor',
        },
      });
    }
  }

  /**
   * Handle low credit warning level
   */
  private async handleLowCredit(client: any, warningThreshold: number) {
    // Get cooldown period from settings
    const cooldownHours = await this.systemSettingsService.getSetting('NOTIFICATION_COOLDOWN_HOURS', 24);

    // Check if we already sent a warning recently
    const recentWarning = await this.prisma.notification.findFirst({
      where: {
        clientId: client.id,
        type: 'LOW_CREDIT_WARNING',
        createdAt: {
          gte: new Date(Date.now() - cooldownHours * 60 * 60 * 1000),
        },
      },
    });

    if (!recentWarning) {
      await this.sendWarningNotifications(client);

      // Get custom message template for notification
      const processedTemplate = await this.templateService.processTemplateForClient(
        'credit_warning',
        'email',
        client.id,
        undefined,
        {
          threshold: warningThreshold,
        }
      );

      await this.prisma.notification.create({
        data: {
          type: 'LOW_CREDIT_WARNING',
          title: 'Low Credit Warning',
          message: processedTemplate.content.replace(/<[^>]*>/g, ''), // Strip HTML for notification
          severity: 'warning',
          clientId: client.id,
          metadata: {
            creditBalance: Number(client.credit),
            warningThreshold: warningThreshold,
          },
        },
      });
    }
  }

  /**
   * Send critical notifications (device shutdown)
   */
  private async sendCriticalNotifications(client: any) {
    const users = client.users || [];
    
    for (const user of users) {
      // Send Email using template
      if (user.email) {
        try {
          const emailTemplate = await this.templateService.processTemplateForClient(
            'credit_critical',
            'email',
            client.id,
            user.id
          );

          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject || 'URGENT: Devices Shut Down - No Credit',
            html: emailTemplate.content,
          });
          this.logger.log(`Critical credit email sent to ${user.email}`);
        } catch (error) {
          this.logger.error(`Failed to send email to ${user.email}`, error);
        }
      }

      // Send SMS using template
      if (user.phone) {
        try {
          const smsTemplate = await this.templateService.processTemplateForClient(
            'credit_critical',
            'sms',
            client.id,
            user.id
          );

          await this.smsService.sendSms({
            to: user.phone,
            message: smsTemplate.content,
          });
          this.logger.log(`Critical credit SMS sent to ${user.phone}`);
        } catch (error) {
          this.logger.error(`Failed to send SMS to ${user.phone}`, error);
        }
      }
    }
  }

  /**
   * Send warning notifications
   */
  private async sendWarningNotifications(client: any) {
    const users = client.users || [];
    
    for (const user of users) {
      // Send Email using template
      if (user.email) {
        try {
          const emailTemplate = await this.templateService.processTemplateForClient(
            'credit_warning',
            'email',
            client.id,
            user.id
          );

          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject || 'Low Credit Warning - LifeBox',
            html: emailTemplate.content,
          });
          this.logger.log(`Warning email sent to ${user.email}`);
        } catch (error) {
          this.logger.error(`Failed to send warning email to ${user.email}`, error);
        }
      }

      // Send SMS using template
      if (user.phone) {
        try {
          const smsTemplate = await this.templateService.processTemplateForClient(
            'credit_warning',
            'sms',
            client.id,
            user.id
          );

          await this.smsService.sendSms({
            to: user.phone,
            message: smsTemplate.content,
          });
          this.logger.log(`Warning SMS sent to ${user.phone}`);
        } catch (error) {
          this.logger.error(`Failed to send warning SMS to ${user.phone}`, error);
        }
      }
    }
  }

  /**
   * Check if device can be turned on (called before any turn-on command)
   */
  async canDeviceTurnOn(deviceId: string): Promise<{ allowed: boolean; message?: string }> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          client: true,
        },
      });

      if (!device) {
        return { allowed: false, message: 'Device not found' };
      }

      // Check if client is prepaid
      if (device.client.billingType === 'prepaid') {
        const criticalThreshold = await this.systemSettingsService.getSetting('CREDIT_CRITICAL_THRESHOLD', 5);
        const creditLevel = Number(device.client.credit);
        
        if (creditLevel <= criticalThreshold) {
          // Log the attempt
          await this.prisma.auditLog.create({
            data: {
              actionType: 'DEVICE_TURN_ON_BLOCKED',
              resourceType: 'DEVICE',
              resourceId: deviceId,
              details: {
                reason: 'Insufficient credit',
                currentBalance: creditLevel,
                requiredBalance: criticalThreshold,
                deviceCode: device.deviceCode,
              },
              ipAddress: 'system',
              userAgent: 'CreditMonitor',
            },
          });

          return {
            allowed: false,
            message: `Cannot turn on device. Insufficient credit (${creditLevel} EGP). Minimum required: ${criticalThreshold} EGP. Please top up via Fawry using code: ${device.client.fawryPaymentId}`,
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error('Error checking device turn-on permission', error);
      return { allowed: false, message: 'Error checking permissions' };
    }
  }

  /**
   * Reactivate devices after successful payment
   */
  async reactivateDevicesAfterPayment(clientId: string) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: {
          devices: {
            where: { isActive: true },
          },
        },
      });

      if (!client) {
        return;
      }

      const criticalThreshold = await this.systemSettingsService.getSetting('CREDIT_CRITICAL_THRESHOLD', 5);
      const creditLevel = Number(client.credit);
      
      // Only reactivate if credit is above threshold
      if (creditLevel > criticalThreshold) {
        // Check if devices were previously shut down due to credit
        const recentShutdown = await this.prisma.notification.findFirst({
          where: {
            clientId: clientId,
            type: 'CRITICAL_CREDIT_SHUTDOWN',
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (recentShutdown) {
          this.logger.log(`Reactivating devices for client ${client.name} after payment`);
          
          // Turn on all client devices
          const reactivationResult = await this.deviceControlService.turnOnAllClientDevices(
            clientId,
            `Credit restored: ${creditLevel} EGP`,
          );

          // Send reactivation notification
          await this.sendReactivationNotification(client);

          // Get custom message template for notification
          const processedTemplate = await this.templateService.processTemplateForClient(
            'device_reactivated',
            'email',
            client.id,
            undefined,
            {
              reactivationTime: new Date(),
              reactivationResult,
            }
          );

          // Record reactivation
          await this.prisma.notification.create({
            data: {
              type: 'DEVICES_REACTIVATED',
              title: 'Devices Reactivated',
              message: processedTemplate.content.replace(/<[^>]*>/g, ''), // Strip HTML for notification
              severity: 'info',
              clientId: clientId,
              metadata: {
                creditBalance: creditLevel,
                threshold: criticalThreshold,
                reactivationResult,
                reactivationTime: new Date(),
              },
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error reactivating devices after payment', error);
    }
  }

  /**
   * Send reactivation notification
   */
  private async sendReactivationNotification(client: any) {
    const users = await this.prisma.user.findMany({
      where: { clientId: client.id },
    });

    for (const user of users) {
      // Send Email using template
      if (user.email) {
        try {
          const emailTemplate = await this.templateService.processTemplateForClient(
            'device_reactivated',
            'email',
            client.id,
            user.id
          );

          await this.emailService.sendEmail({
            to: user.email,
            subject: emailTemplate.subject || '✅ Service Restored - LifeBox',
            html: emailTemplate.content,
          });
          this.logger.log(`Reactivation email sent to ${user.email}`);
        } catch (error) {
          this.logger.error(`Failed to send reactivation email to ${user.email}`, error);
        }
      }

      // Send SMS using template
      if (user.phone) {
        try {
          const smsTemplate = await this.templateService.processTemplateForClient(
            'device_reactivated',
            'sms',
            client.id,
            user.id
          );

          await this.smsService.sendSms({
            to: user.phone,
            message: smsTemplate.content,
          });
          this.logger.log(`Reactivation SMS sent to ${user.phone}`);
        } catch (error) {
          this.logger.error(`Failed to send reactivation SMS to ${user.phone}`, error);
        }
      }
    }
  }

  // Old email templates removed - now using configurable templates via TemplateService
}