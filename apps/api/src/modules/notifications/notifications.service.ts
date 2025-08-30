import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { VodafoneSmsService } from './vodafone-sms.service';
import { HybridSmsRouterService } from './hybrid-sms-router.service';
import {
  SendNotificationDto,
  SendTemplatedNotificationDto,
  BulkNotificationDto,
  NotificationPreferencesDto,
  CreateNotificationTemplateDto,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationTemplate,
} from './dto/notification-request.dto';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  recipientId: string;
  title: string;
  message: string;
  data?: any;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  sentAt?: Date;
  scheduledFor?: Date;
  failureReason?: string;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  scheduled: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notifications: Map<string, NotificationRecord> = new Map();
  private templates: Map<string, any> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly vodafoneSmsService: VodafoneSmsService,
    private readonly hybridSmsRouter: HybridSmsRouterService,
  ) {
    this.initializeDefaultTemplates();
  }

  async sendNotification(notificationDto: SendNotificationDto, userId: string): Promise<string> {
    try {
      // Validate recipient
      const recipient = await this.getRecipientDetails(notificationDto.recipientId);
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }

      // Check user preferences
      const preferences = await this.getUserPreferences(notificationDto.recipientId);
      if (!this.shouldSendNotification(notificationDto, preferences)) {
        this.logger.debug(`Notification skipped due to user preferences for ${notificationDto.recipientId}`);
        return 'skipped';
      }

      // Create notification record
      const notificationId = this.generateNotificationId();
      const notification: NotificationRecord = {
        id: notificationId,
        type: notificationDto.type,
        category: notificationDto.category,
        priority: notificationDto.priority,
        recipientId: notificationDto.recipientId,
        title: notificationDto.title,
        message: notificationDto.message,
        data: notificationDto.data,
        status: notificationDto.scheduleFor ? 'scheduled' : 'pending',
        scheduledFor: notificationDto.scheduleFor ? new Date(notificationDto.scheduleFor) : undefined,
        createdAt: new Date(),
      };

      this.notifications.set(notificationId, notification);

      // Send immediately or schedule
      if (notificationDto.scheduleFor) {
        this.scheduleNotification(notification);
        return notificationId;
      } else {
        return await this.deliverNotification(notification, recipient);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  async sendTemplatedNotification(templateDto: SendTemplatedNotificationDto, userId: string): Promise<string[]> {
    try {
      // Get recipient details
      const recipient = await this.getRecipientDetails(templateDto.recipientId);
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(templateDto.recipientId);

      const results: string[] = [];

      // Send notification for each requested type
      for (const type of templateDto.types) {
        if (!this.isTypeEnabled(type, preferences)) {
          results.push(`${type}:skipped`);
          continue;
        }

        const notificationDto: SendNotificationDto = {
          type,
          priority: templateDto.priority || NotificationPriority.NORMAL,
          category: this.getCategoryForTemplate(templateDto.template),
          recipientId: templateDto.recipientId,
          title: await this.renderTemplateSubject(templateDto.template, templateDto.templateData),
          message: await this.renderTemplateMessage(templateDto.template, type, templateDto.templateData),
          data: templateDto.templateData,
          scheduleFor: templateDto.scheduleFor,
        };

        const result = await this.sendNotification(notificationDto, userId);
        results.push(`${type}:${result}`);
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to send templated notification: ${error.message}`);
      throw error;
    }
  }

  async sendBulkNotification(bulkDto: BulkNotificationDto, userId: string): Promise<{ success: number; failed: number; skipped: number }> {
    const results = { success: 0, failed: 0, skipped: 0 };

    for (const recipientId of bulkDto.recipientIds) {
      try {
        const notificationDto: SendNotificationDto = {
          type: bulkDto.type,
          priority: bulkDto.priority || NotificationPriority.NORMAL,
          category: bulkDto.category,
          recipientId,
          title: bulkDto.title,
          message: bulkDto.message,
          data: bulkDto.data,
        };

        const result = await this.sendNotification(notificationDto, userId);
        
        if (result === 'skipped') {
          results.skipped++;
        } else {
          results.success++;
        }

        // Rate limiting
        if (bulkDto.delayMs) {
          await new Promise(resolve => setTimeout(resolve, bulkDto.delayMs));
        }
      } catch (error) {
        this.logger.error(`Failed to send notification to ${recipientId}: ${error.message}`);
        results.failed++;
      }
    }

    this.logger.log(`Bulk notification completed: ${results.success} sent, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      // In a real implementation, this would fetch from database
      // For now, return default preferences
      return {
        emailEnabled: true,
        smsEnabled: true,
        inAppEnabled: true,
        enabledCategories: Object.values(NotificationCategory),
        minimumPriority: NotificationPriority.LOW,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Africa/Cairo',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user preferences: ${error.message}`);
      return this.getDefaultPreferences();
    }
  }

  async updateUserPreferences(userId: string, preferences: NotificationPreferencesDto): Promise<boolean> {
    try {
      // In a real implementation, this would update the database
      this.logger.log(`Updated notification preferences for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update user preferences: ${error.message}`);
      return false;
    }
  }

  async getNotificationHistory(userId: string, recipientId?: string): Promise<NotificationRecord[]> {
    try {
      // Filter notifications by recipient if specified
      const notifications = Array.from(this.notifications.values());
      
      if (recipientId) {
        return notifications.filter(n => n.recipientId === recipientId);
      }

      // For admin users, return all notifications
      // For regular users, return only their notifications
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (['super_user', 'admin'].includes(user.role.name)) {
        return notifications;
      } else {
        return notifications.filter(n => n.recipientId === userId);
      }
    } catch (error) {
      this.logger.error(`Failed to get notification history: ${error.message}`);
      throw error;
    }
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.getNotificationHistory(userId);

      const stats: NotificationStats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        scheduled: notifications.filter(n => n.status === 'scheduled').length,
        byType: {} as Record<NotificationType, number>,
        byCategory: {} as Record<NotificationCategory, number>,
        byPriority: {} as Record<NotificationPriority, number>,
      };

      // Initialize counters
      Object.values(NotificationType).forEach(type => {
        stats.byType[type] = 0;
      });
      Object.values(NotificationCategory).forEach(category => {
        stats.byCategory[category] = 0;
      });
      Object.values(NotificationPriority).forEach(priority => {
        stats.byPriority[priority] = 0;
      });

      // Count by type, category, and priority
      notifications.forEach(notification => {
        stats.byType[notification.type]++;
        stats.byCategory[notification.category]++;
        stats.byPriority[notification.priority]++;
      });

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get notification stats: ${error.message}`);
      throw error;
    }
  }

  async createCustomTemplate(templateDto: CreateNotificationTemplateDto, userId: string): Promise<boolean> {
    try {
      const template = {
        id: templateDto.templateId,
        name: templateDto.name,
        category: templateDto.category,
        emailSubject: templateDto.emailSubject,
        emailHtml: templateDto.emailHtml,
        smsMessage: templateDto.smsMessage,
        variables: templateDto.variables || {},
        defaultPriority: templateDto.defaultPriority || NotificationPriority.NORMAL,
        createdBy: userId,
        createdAt: new Date(),
      };

      this.templates.set(templateDto.templateId, template);
      this.logger.log(`Created custom template: ${templateDto.templateId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create custom template: ${error.message}`);
      throw error;
    }
  }

  async getNotificationTemplates(userId: string): Promise<any[]> {
    try {
      const templates = Array.from(this.templates.values());
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        variables: template.variables,
        defaultPriority: template.defaultPriority,
        createdAt: template.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get notification templates: ${error.message}`);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      // Mark as read (in real implementation, update database)
      this.logger.log(`Marked notification ${notificationId} as read by user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      return false;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      // Check permissions (user can only delete their own notifications)
      if (notification.recipientId !== userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });

        if (!user || !['super_user', 'admin'].includes(user.role.name)) {
          throw new BadRequestException('Access denied');
        }
      }

      this.notifications.delete(notificationId);
      this.logger.log(`Deleted notification ${notificationId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send SMS to all phone numbers associated with a client
   */
  async sendSmsToClient(clientId: string, message: string): Promise<{success: boolean, results: any[]}> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: {
          users: {
            take: 1,
            where: {
              role: {
                name: { in: ['client_user', 'client_admin'] },
              },
            },
          },
        },
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      // Collect all phone numbers from client table
      const clientPhoneNumbers = [
        client.phoneNumber1,
        client.phoneNumber2,
        client.phoneNumber3,
      ].filter(phone => phone && phone.trim() !== '');

      // Also include user's phone if available
      const userPhone = client.users.length > 0 ? client.users[0].phone : null;
      const allPhoneNumbers = userPhone 
        ? [...clientPhoneNumbers, userPhone]
        : clientPhoneNumbers;

      // Remove duplicates
      const uniquePhoneNumbers = [...new Set(allPhoneNumbers)];

      if (uniquePhoneNumbers.length === 0) {
        throw new BadRequestException('No phone numbers found for this client');
      }

      const smsResults = [];
      let anySuccess = false;

      for (const phoneNumber of uniquePhoneNumbers) {
        try {
          const smsResult = await this.hybridSmsRouter.sendSms({
            to: phoneNumber,
            message: message,
          });
          
          smsResults.push({
            phone: phoneNumber,
            success: smsResult.success,
            provider: smsResult.provider,
            region: smsResult.phoneRegion,
            reason: smsResult.routingReason,
            deliveryTime: smsResult.deliveryTime,
          });
          
          if (smsResult.success) {
            anySuccess = true;
          }
        } catch (error) {
          this.logger.error(`Failed to send SMS to ${phoneNumber}: ${error.message}`);
          smsResults.push({
            phone: phoneNumber,
            success: false,
            error: error.message,
          });
        }
      }

      this.logger.log(`SMS sent to client ${clientId}`, {
        totalNumbers: uniquePhoneNumbers.length,
        successfulSends: smsResults.filter(r => r.success).length,
        results: smsResults,
      });

      return {
        success: anySuccess,
        results: smsResults,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async getRecipientDetails(recipientId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        include: {
          client: true,
        },
      });

      if (user) {
        // If user belongs to a client, include client phone numbers too
        const phoneNumbers = [];
        
        // Add user's phone number
        if (user.phone) {
          phoneNumbers.push(user.phone);
        }
        
        // Add client phone numbers if user belongs to a client
        if (user.client) {
          const clientPhoneNumbers = [
            user.client.phoneNumber1,
            user.client.phoneNumber2,
            user.client.phoneNumber3,
          ].filter(phone => phone && phone.trim() !== '');
          
          phoneNumbers.push(...clientPhoneNumbers);
        }

        return {
          type: 'user',
          id: user.id,
          email: user.email,
          phone: user.phone,
          phoneNumbers: phoneNumbers.length > 0 ? [...new Set(phoneNumbers)] : undefined, // Remove duplicates
          name: user.fullName || user.email,
          client: user.client,
        };
      }

      // Try to find as client
      const client = await this.prisma.client.findUnique({
        where: { id: recipientId },
        include: {
          users: {
            take: 1,
            where: {
              role: {
                name: { in: ['client_user', 'client_admin'] },
              },
            },
          },
        },
      });

      if (client && client.users.length > 0) {
        const primaryUser = client.users[0];
        
        // Collect all phone numbers from client table
        const clientPhoneNumbers = [
          client.phoneNumber1,
          client.phoneNumber2,
          client.phoneNumber3,
        ].filter(phone => phone && phone.trim() !== '');
        
        // Also include user's phone if available
        const allPhoneNumbers = primaryUser.phone 
          ? [...clientPhoneNumbers, primaryUser.phone]
          : clientPhoneNumbers;

        return {
          type: 'client',
          id: client.id,
          email: primaryUser.email,
          phone: primaryUser.phone,
          phoneNumbers: [...new Set(allPhoneNumbers)], // Remove duplicates
          name: client.name,
          client: client,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get recipient details: ${error.message}`);
      return null;
    }
  }

  private shouldSendNotification(notification: SendNotificationDto, preferences: any): boolean {
    // Check if notification type is enabled
    if (!this.isTypeEnabled(notification.type, preferences)) {
      return false;
    }

    // Check if category is enabled
    if (!preferences.enabledCategories.includes(notification.category)) {
      return false;
    }

    // Check priority level
    const priorityOrder = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.NORMAL]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.CRITICAL]: 3,
    };

    if (priorityOrder[notification.priority] < priorityOrder[preferences.minimumPriority]) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled && this.isInQuietHours(preferences.quietHours)) {
      // Allow critical notifications even in quiet hours
      return notification.priority === NotificationPriority.CRITICAL;
    }

    return true;
  }

  private isTypeEnabled(type: NotificationType, preferences: any): boolean {
    switch (type) {
      case NotificationType.EMAIL:
        return preferences.emailEnabled;
      case NotificationType.SMS:
        return preferences.smsEnabled;
      case NotificationType.IN_APP:
        return preferences.inAppEnabled;
      default:
        return true;
    }
  }

  private isInQuietHours(quietHours: any): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Simple time comparison (in real implementation, consider timezone)
    return currentTime >= quietHours.startTime || currentTime <= quietHours.endTime;
  }

  private async deliverNotification(notification: NotificationRecord, recipient: any): Promise<string> {
    try {
      let success = false;

      switch (notification.type) {
        case NotificationType.EMAIL:
          success = await this.emailService.sendEmail({
            to: recipient.email,
            subject: notification.title,
            html: notification.message,
          });
          break;

        case NotificationType.SMS:
          // Send SMS to all phone numbers if multiple are available
          if (recipient.phoneNumbers && recipient.phoneNumbers.length > 0) {
            const smsResults = [];
            let anySuccess = false;
            
            for (const phoneNumber of recipient.phoneNumbers) {
              try {
                const smsResult = await this.hybridSmsRouter.sendSms({
                  to: phoneNumber,
                  message: `${notification.title}: ${notification.message}`,
                });
                
                smsResults.push({
                  phone: phoneNumber,
                  success: smsResult.success,
                  provider: smsResult.provider,
                  region: smsResult.phoneRegion,
                  reason: smsResult.routingReason,
                  deliveryTime: smsResult.deliveryTime,
                });
                
                if (smsResult.success) {
                  anySuccess = true;
                }
              } catch (error) {
                this.logger.error(`Failed to send SMS to ${phoneNumber}: ${error.message}`);
                smsResults.push({
                  phone: phoneNumber,
                  success: false,
                  error: error.message,
                });
              }
            }
            
            success = anySuccess;
            
            // Log routing details for all phone numbers
            this.logger.log('SMS sent to multiple numbers', {
              recipientId: recipient.id,
              totalNumbers: recipient.phoneNumbers.length,
              successfulSends: smsResults.filter(r => r.success).length,
              results: smsResults,
            });
          } else if (recipient.phone) {
            // Fallback to single phone number (backward compatibility)
            const smsResult = await this.hybridSmsRouter.sendSms({
              to: recipient.phone,
              message: `${notification.title}: ${notification.message}`,
            });
            success = smsResult.success;
            
            // Log routing details for monitoring
            this.logger.debug('SMS routing result', {
              success: smsResult.success,
              provider: smsResult.provider,
              region: smsResult.phoneRegion,
              reason: smsResult.routingReason,
              deliveryTime: `${smsResult.deliveryTime}ms`,
            });
          } else {
            throw new BadRequestException('No phone number available for SMS');
          }
          break;

        case NotificationType.IN_APP:
          // In-app notifications would be stored in database for real-time delivery
          success = true;
          break;

        default:
          throw new BadRequestException('Unsupported notification type');
      }

      // Update notification status
      notification.status = success ? 'sent' : 'failed';
      notification.sentAt = success ? new Date() : undefined;
      notification.failureReason = success ? undefined : 'Delivery failed';

      this.notifications.set(notification.id, notification);

      this.logger.log(`Notification ${notification.id} ${success ? 'sent' : 'failed'} to ${recipient.email || recipient.phone}`);
      return notification.id;
    } catch (error) {
      notification.status = 'failed';
      notification.failureReason = error.message;
      this.notifications.set(notification.id, notification);
      throw error;
    }
  }

  private scheduleNotification(notification: NotificationRecord): void {
    const delay = notification.scheduledFor!.getTime() - Date.now();
    
    if (delay <= 0) {
      // Schedule for immediate delivery
      this.processScheduledNotification(notification.id);
    } else {
      // Schedule for future delivery
      setTimeout(() => {
        this.processScheduledNotification(notification.id);
      }, delay);
    }
  }

  private async processScheduledNotification(notificationId: string): Promise<void> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification || notification.status !== 'scheduled') {
        return;
      }

      const recipient = await this.getRecipientDetails(notification.recipientId);
      if (recipient) {
        await this.deliverNotification(notification, recipient);
      }
    } catch (error) {
      this.logger.error(`Failed to process scheduled notification ${notificationId}: ${error.message}`);
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCategoryForTemplate(template: NotificationTemplate): NotificationCategory {
    const categoryMap = {
      [NotificationTemplate.LOW_CREDIT]: NotificationCategory.PAYMENT,
      [NotificationTemplate.PAYMENT_RECEIVED]: NotificationCategory.PAYMENT,
      [NotificationTemplate.DEVICE_OFFLINE]: NotificationCategory.DEVICE,
      [NotificationTemplate.DEVICE_ONLINE]: NotificationCategory.DEVICE,
      [NotificationTemplate.CRITICAL_ALARM]: NotificationCategory.ALARM,
      [NotificationTemplate.MONTHLY_REPORT]: NotificationCategory.REPORT,
      [NotificationTemplate.MAINTENANCE_ALERT]: NotificationCategory.MAINTENANCE,
      [NotificationTemplate.WELCOME]: NotificationCategory.SYSTEM,
      [NotificationTemplate.PASSWORD_RESET]: NotificationCategory.SYSTEM,
      [NotificationTemplate.SYSTEM_UPDATE]: NotificationCategory.SYSTEM,
    };

    return categoryMap[template] || NotificationCategory.SYSTEM;
  }

  private async renderTemplateSubject(template: NotificationTemplate, data: any): Promise<string> {
    const templates = {
      [NotificationTemplate.LOW_CREDIT]: 'Low Credit Alert - LifeBox',
      [NotificationTemplate.PAYMENT_RECEIVED]: 'Payment Received - LifeBox',
      [NotificationTemplate.DEVICE_OFFLINE]: `Device Alert: ${data.deviceCode || 'Device'} Offline`,
      [NotificationTemplate.DEVICE_ONLINE]: `Device Alert: ${data.deviceCode || 'Device'} Back Online`,
      [NotificationTemplate.CRITICAL_ALARM]: `CRITICAL ALERT: ${data.alarmType || 'System Alert'}`,
      [NotificationTemplate.MONTHLY_REPORT]: `Monthly Report - ${data.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      [NotificationTemplate.MAINTENANCE_ALERT]: 'Maintenance Alert - LifeBox',
      [NotificationTemplate.WELCOME]: 'Welcome to LifeBox',
      [NotificationTemplate.PASSWORD_RESET]: 'Password Reset Request - LifeBox',
      [NotificationTemplate.SYSTEM_UPDATE]: 'System Update Notification - LifeBox',
    };

    return templates[template] || 'Notification - LifeBox';
  }

  private async renderTemplateMessage(template: NotificationTemplate, type: NotificationType, data: any): Promise<string> {
    if (type === NotificationType.EMAIL) {
      return this.renderEmailTemplate(template, data);
    } else if (type === NotificationType.SMS) {
      return this.renderSmsTemplate(template, data);
    } else {
      return this.renderInAppTemplate(template, data);
    }
  }

  private renderEmailTemplate(template: NotificationTemplate, data: any): string {
    // This would typically use a real template engine like Handlebars
    const templates = {
      [NotificationTemplate.LOW_CREDIT]: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Low Credit Alert</h2>
          <p>Your current balance is <strong>${data.balance || 'N/A'} EGP</strong></p>
          <p>Please top up to avoid service interruption.</p>
          <p>Fawry Payment Code: <strong>${data.fawryCode || 'N/A'}</strong></p>
        </div>
      `,
      [NotificationTemplate.PAYMENT_RECEIVED]: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Payment Received</h2>
          <p>We have received your payment of <strong>${data.amount || 'N/A'} EGP</strong></p>
          <p>New Balance: <strong>${data.newBalance || 'N/A'} EGP</strong></p>
          <p>Transaction ID: ${data.transactionId || 'N/A'}</p>
        </div>
      `,
      [NotificationTemplate.DEVICE_OFFLINE]: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Device Offline Alert</h2>
          <p>Device <strong>${data.deviceCode || 'N/A'}</strong> has been offline since ${data.offlineSince || 'N/A'}</p>
          <p>Please check the device connection and power supply.</p>
        </div>
      `,
      [NotificationTemplate.CRITICAL_ALARM]: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: red;">CRITICAL ALARM</h2>
          <p><strong>Device:</strong> ${data.deviceCode || 'N/A'}</p>
          <p><strong>Alarm Type:</strong> ${data.alarmType || 'N/A'}</p>
          <p><strong>Message:</strong> ${data.message || 'N/A'}</p>
          <p><strong>Time:</strong> ${data.timestamp || new Date().toLocaleString()}</p>
          <p style="color: red;">Immediate attention required!</p>
        </div>
      `,
    };

    return templates[template] || `<div style="font-family: Arial, sans-serif;"><p>${JSON.stringify(data)}</p></div>`;
  }

  private renderSmsTemplate(template: NotificationTemplate, data: any): string {
    const templates = {
      [NotificationTemplate.LOW_CREDIT]: `LifeBox: Low credit! Balance: ${data.balance || 'N/A'} EGP. Top up via Fawry (${data.fawryCode || 'N/A'}).`,
      [NotificationTemplate.PAYMENT_RECEIVED]: `LifeBox: Payment received! Amount: ${data.amount || 'N/A'} EGP. New balance: ${data.newBalance || 'N/A'} EGP.`,
      [NotificationTemplate.DEVICE_OFFLINE]: `LifeBox Alert: Device ${data.deviceCode || 'N/A'} is offline. Check connection.`,
      [NotificationTemplate.CRITICAL_ALARM]: `LifeBox URGENT: ${data.alarmType || 'Alert'} on ${data.deviceCode || 'device'}. ${data.message || 'Check immediately!'}`,
    };

    return templates[template] || `LifeBox: ${JSON.stringify(data)}`;
  }

  private renderInAppTemplate(template: NotificationTemplate, data: any): string {
    const templates = {
      [NotificationTemplate.LOW_CREDIT]: `Your account balance is low (${data.balance || 'N/A'} EGP). Please top up to continue service.`,
      [NotificationTemplate.PAYMENT_RECEIVED]: `Payment of ${data.amount || 'N/A'} EGP received. New balance: ${data.newBalance || 'N/A'} EGP.`,
      [NotificationTemplate.DEVICE_OFFLINE]: `Device ${data.deviceCode || 'N/A'} went offline at ${data.offlineSince || 'unknown time'}. Check device status.`,
      [NotificationTemplate.CRITICAL_ALARM]: `CRITICAL: ${data.alarmType || 'System alarm'} detected on ${data.deviceCode || 'device'}. ${data.message || 'Immediate action required.'}`,
    };

    return templates[template] || JSON.stringify(data);
  }

  private initializeDefaultTemplates(): void {
    // Initialize built-in templates
    const defaultTemplates = [
      {
        id: 'low_credit_default',
        name: 'Low Credit Alert',
        category: NotificationCategory.PAYMENT,
        emailSubject: 'Low Credit Alert - LifeBox',
        emailHtml: '<div>Your balance is low: {{balance}} EGP</div>',
        smsMessage: 'LifeBox: Low credit! Balance: {{balance}} EGP.',
        variables: { balance: 'Current account balance', fawryCode: 'Fawry payment code' },
        defaultPriority: NotificationPriority.HIGH,
      },
      // Add more default templates as needed
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private getDefaultPreferences(): any {
    return {
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      enabledCategories: Object.values(NotificationCategory),
      minimumPriority: NotificationPriority.LOW,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Africa/Cairo',
      },
    };
  }
}