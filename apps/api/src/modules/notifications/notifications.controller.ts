import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { VodafoneSmsService } from './vodafone-sms.service';
import { HybridSmsRouterService } from './hybrid-sms-router.service';
import {
  SendNotificationDto,
  SendTemplatedNotificationDto,
  BulkNotificationDto,
  NotificationPreferencesDto,
  CreateNotificationTemplateDto,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from './dto/notification-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly vodafoneSmsService: VodafoneSmsService,
    private readonly hybridSmsRouter: HybridSmsRouterService,
  ) {}

  /**
   * Send a single notification
   */
  @Post('send')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a notification',
    description: 'Send a single notification via email, SMS, or in-app',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        notificationId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const notificationId = await this.notificationsService.sendNotification(
        sendNotificationDto,
        user.id,
      );

      return {
        success: true,
        notificationId,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send templated notification
   */
  @Post('send/template')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send templated notification',
    description: 'Send a notification using predefined templates',
  })
  @ApiResponse({
    status: 201,
    description: 'Templated notifications sent successfully',
  })
  async sendTemplatedNotification(
    @Body() templateDto: SendTemplatedNotificationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const results = await this.notificationsService.sendTemplatedNotification(
        templateDto,
        user.id,
      );

      return {
        success: true,
        results,
        message: 'Templated notifications processed',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send templated notification: ${error.message}`);
    }
  }

  /**
   * Send bulk notifications
   */
  @Post('send/bulk')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send bulk notifications',
    description: 'Send notifications to multiple recipients (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications sent successfully',
  })
  async sendBulkNotification(
    @Body() bulkDto: BulkNotificationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const results = await this.notificationsService.sendBulkNotification(bulkDto, user.id);

      return {
        success: true,
        results,
        message: `Bulk notifications completed: ${results.success} sent, ${results.failed} failed, ${results.skipped} skipped`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send bulk notifications: ${error.message}`);
    }
  }

  /**
   * Get user notification preferences
   */
  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Retrieve user notification preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
  })
  async getUserPreferences(@CurrentUser() user: any) {
    try {
      const preferences = await this.notificationsService.getUserPreferences(user.id);

      return {
        success: true,
        data: preferences,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get preferences: ${error.message}`);
    }
  }

  /**
   * Update user notification preferences
   */
  @Put('preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update user notification preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  async updateUserPreferences(
    @Body() preferencesDto: NotificationPreferencesDto,
    @CurrentUser() user: any,
  ) {
    try {
      const success = await this.notificationsService.updateUserPreferences(
        user.id,
        preferencesDto,
      );

      return {
        success,
        message: success ? 'Preferences updated successfully' : 'Failed to update preferences',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update preferences: ${error.message}`);
    }
  }

  /**
   * Get notification history
   */
  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification history',
    description: 'Retrieve notification history for the user or specified recipient',
  })
  @ApiQuery({
    name: 'recipientId',
    description: 'Filter by recipient ID',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
  })
  async getNotificationHistory(
    @Query('recipientId') recipientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const history = await this.notificationsService.getNotificationHistory(user.id, recipientId);

      return {
        success: true,
        data: history,
        count: history.length,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get notification history: ${error.message}`);
    }
  }

  /**
   * Get notification statistics
   */
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification statistics',
    description: 'Retrieve notification statistics and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics retrieved successfully',
  })
  async getNotificationStats(@CurrentUser() user: any) {
    try {
      const stats = await this.notificationsService.getNotificationStats(user.id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get notification stats: ${error.message}`);
    }
  }

  /**
   * Get notification templates
   */
  @Get('templates')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification templates',
    description: 'Retrieve available notification templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification templates retrieved successfully',
  })
  async getNotificationTemplates(@CurrentUser() user: any) {
    try {
      const templates = await this.notificationsService.getNotificationTemplates(user.id);

      return {
        success: true,
        data: templates,
        count: templates.length,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get notification templates: ${error.message}`);
    }
  }

  /**
   * Create custom notification template
   */
  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create notification template',
    description: 'Create a custom notification template (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification template created successfully',
  })
  async createNotificationTemplate(
    @Body() templateDto: CreateNotificationTemplateDto,
    @CurrentUser() user: any,
  ) {
    try {
      const success = await this.notificationsService.createCustomTemplate(templateDto, user.id);

      return {
        success,
        message: success ? 'Template created successfully' : 'Failed to create template',
        templateId: templateDto.templateId,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   */
  @Put(':notificationId/read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the notification to mark as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
  })
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const success = await this.notificationsService.markAsRead(notificationId, user.id);

      return {
        success,
        message: success ? 'Notification marked as read' : 'Failed to mark as read',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Delete notification
   */
  @Delete(':notificationId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the notification to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const success = await this.notificationsService.deleteNotification(notificationId, user.id);

      return {
        success,
        message: success ? 'Notification deleted successfully' : 'Failed to delete notification',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Get available notification types and options
   */
  @Get('options')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification options',
    description: 'Retrieve available notification types, categories, and priorities',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification options retrieved successfully',
  })
  async getNotificationOptions() {
    return {
      success: true,
      data: {
        types: [
          {
            value: NotificationType.EMAIL,
            name: 'Email',
            description: 'Send notification via email',
          },
          {
            value: NotificationType.SMS,
            name: 'SMS',
            description: 'Send notification via SMS',
          },
          {
            value: NotificationType.PUSH,
            name: 'Push Notification',
            description: 'Send push notification to mobile app',
          },
          {
            value: NotificationType.IN_APP,
            name: 'In-App',
            description: 'Show notification within the application',
          },
        ],
        categories: [
          {
            value: NotificationCategory.SYSTEM,
            name: 'System',
            description: 'System-related notifications',
          },
          {
            value: NotificationCategory.DEVICE,
            name: 'Device',
            description: 'Device status and alerts',
          },
          {
            value: NotificationCategory.PAYMENT,
            name: 'Payment',
            description: 'Payment and billing notifications',
          },
          {
            value: NotificationCategory.ALARM,
            name: 'Alarm',
            description: 'Alarm and critical alerts',
          },
          {
            value: NotificationCategory.REPORT,
            name: 'Report',
            description: 'Reports and analytics',
          },
          {
            value: NotificationCategory.MARKETING,
            name: 'Marketing',
            description: 'Promotional and marketing messages',
          },
          {
            value: NotificationCategory.MAINTENANCE,
            name: 'Maintenance',
            description: 'Maintenance and service notifications',
          },
        ],
        priorities: [
          {
            value: NotificationPriority.LOW,
            name: 'Low',
            description: 'Low priority notifications',
          },
          {
            value: NotificationPriority.NORMAL,
            name: 'Normal',
            description: 'Normal priority notifications',
          },
          {
            value: NotificationPriority.HIGH,
            name: 'High',
            description: 'High priority notifications',
          },
          {
            value: NotificationPriority.CRITICAL,
            name: 'Critical',
            description: 'Critical notifications (bypass quiet hours)',
          },
        ],
      },
    };
  }

  /**
   * Test notification system
   */
  @Post('test')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test notification system',
    description: 'Send test notifications to verify system functionality (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Test notifications sent successfully',
  })
  async testNotificationSystem(@CurrentUser() user: any) {
    try {
      const testNotifications = [
        {
          type: NotificationType.EMAIL,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.NORMAL,
          recipientId: user.id,
          title: 'Test Email Notification',
          message: 'This is a test email notification from LifeBox system.',
        },
        {
          type: NotificationType.SMS,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.NORMAL,
          recipientId: user.id,
          title: 'Test SMS Notification',
          message: 'This is a test SMS notification from LifeBox system.',
        },
      ];

      const results = [];

      for (const notification of testNotifications) {
        try {
          const notificationId = await this.notificationsService.sendNotification(
            notification as SendNotificationDto,
            user.id,
          );
          results.push({ type: notification.type, status: 'sent', id: notificationId });
        } catch (error) {
          results.push({ type: notification.type, status: 'failed', error: error.message });
        }
      }

      return {
        success: true,
        results,
        message: 'Test notifications completed',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to test notification system: ${error.message}`);
    }
  }

  /**
   * Get notification delivery status
   */
  @Get(':notificationId/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification status',
    description: 'Get the delivery status of a specific notification',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the notification to check status for',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification status retrieved successfully',
  })
  async getNotificationStatus(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const history = await this.notificationsService.getNotificationHistory(user.id);
      const notification = history.find(n => n.id === notificationId);

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return {
        success: true,
        data: {
          id: notification.id,
          status: notification.status,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          title: notification.title,
          createdAt: notification.createdAt,
          sentAt: notification.sentAt,
          scheduledFor: notification.scheduledFor,
          failureReason: notification.failureReason,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get notification status: ${error.message}`);
    }
  }

  /**
   * Retry failed notification
   */
  @Post(':notificationId/retry')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retry failed notification',
    description: 'Retry sending a failed notification',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the failed notification to retry',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retry initiated successfully',
  })
  async retryNotification(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const history = await this.notificationsService.getNotificationHistory(user.id);
      const notification = history.find(n => n.id === notificationId);

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.status !== 'failed') {
        throw new BadRequestException('Only failed notifications can be retried');
      }

      // Create a new notification for retry
      const retryDto: SendNotificationDto = {
        type: notification.type,
        priority: notification.priority,
        category: notification.category,
        recipientId: notification.recipientId,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      };

      const newNotificationId = await this.notificationsService.sendNotification(retryDto, user.id);

      return {
        success: true,
        newNotificationId,
        message: 'Notification retry initiated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retry notification: ${error.message}`);
    }
  }

  // Hybrid SMS Router Endpoints

  /**
   * Send SMS with intelligent routing (recommended)
   */
  @Post('sms/send')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin', 'client', 'operator')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send SMS with intelligent routing',
    description: 'Send SMS using hybrid routing: Vodafone for Egypt, Twilio for international',
  })
  @ApiResponse({
    status: 201,
    description: 'SMS sent with routing details',
  })
  async sendHybridSms(
    @Body() data: { 
      to: string; 
      message: string; 
      from?: string; 
      forceProvider?: 'vodafone' | 'twilio' | 'auto';
    },
  ) {
    try {
      const result = await this.hybridSmsRouter.sendSms({
        to: data.to,
        message: data.message,
        from: data.from,
        forceProvider: data.forceProvider || 'auto',
      });

      return {
        success: result.success,
        provider: result.provider,
        phoneRegion: result.phoneRegion,
        routingReason: result.routingReason,
        deliveryTime: result.deliveryTime,
        error: result.error,
        to: data.to,
      };
    } catch (error) {
      throw new BadRequestException(`Hybrid SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send bulk SMS with intelligent routing
   */
  @Post('sms/send/bulk')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send bulk SMS with intelligent routing',
    description: 'Send SMS to multiple recipients with automatic provider selection',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk SMS completed with statistics',
  })
  async sendBulkHybridSms(
    @Body() data: {
      recipients: Array<{ to: string; message: string; from?: string }>;
      delayMs?: number;
      forceProvider?: 'vodafone' | 'twilio' | 'auto';
      continueOnError?: boolean;
    },
  ) {
    try {
      const result = await this.hybridSmsRouter.sendBulkSms(data.recipients, {
        delayMs: data.delayMs || 1000,
        forceProvider: data.forceProvider || 'auto',
        continueOnError: data.continueOnError !== false,
      });

      return {
        success: result.successful > 0,
        summary: {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
        },
        providerStats: result.providerStats,
        regionStats: result.regionStats,
        results: result.results,
      };
    } catch (error) {
      throw new BadRequestException(`Bulk hybrid SMS failed: ${error.message}`);
    }
  }

  /**
   * Get hybrid SMS router status and configuration
   */
  @Get('sms/router/status')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get SMS router status and configuration',
    description: 'Retrieve current routing configuration and provider availability',
  })
  @ApiResponse({
    status: 200,
    description: 'Router status retrieved',
  })
  async getHybridSmsStatus() {
    try {
      const status = await this.hybridSmsRouter.getServicesStatus();
      const stats = this.hybridSmsRouter.getRoutingStats();

      return {
        success: true,
        services: status,
        routing: stats,
        recommendations: this.generateRoutingRecommendations(status, stats),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get router status: ${error.message}`);
    }
  }

  /**
   * Test SMS routing for specific phone numbers
   */
  @Post('sms/router/test-routing')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test SMS routing logic',
    description: 'Test which provider would be selected for given phone numbers',
  })
  @ApiResponse({
    status: 200,
    description: 'Routing test results',
  })
  async testSmsRouting(
    @Body() data: { phoneNumbers: string[] },
  ) {
    try {
      const results = data.phoneNumbers.map(phone => {
        // This would use internal router methods to determine routing
        // For now, we'll create a simple preview
        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        const isEgyptian = normalizedPhone.startsWith('+20') || normalizedPhone.startsWith('01') || normalizedPhone.startsWith('20');
        const phoneRegion = isEgyptian ? 'egypt' : 'international';
        const selectedProvider = isEgyptian ? 'vodafone' : 'twilio';
        
        return {
          originalPhone: phone,
          normalizedPhone,
          phoneRegion,
          selectedProvider,
          reason: `${phoneRegion} number routed to ${selectedProvider}`,
        };
      });

      return {
        success: true,
        results,
        totalTested: results.length,
        routingStats: {
          vodafone: results.filter(r => r.selectedProvider === 'vodafone').length,
          twilio: results.filter(r => r.selectedProvider === 'twilio').length,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Routing test failed: ${error.message}`);
    }
  }

  // SMS Service Testing Endpoints

  /**
   * Test SMS sending (Legacy - use hybrid routing instead)
   */
  @Post('sms/test')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test SMS sending',
    description: 'Test SMS sending using Vodafone (primary) and Twilio (backup) services',
  })
  @ApiResponse({
    status: 201,
    description: 'SMS test completed',
  })
  async testSms(
    @Body() testData: { to: string; message: string; provider?: 'vodafone' | 'twilio' },
  ) {
    try {
      let success = false;
      let provider = 'none';

      if (!testData.provider || testData.provider === 'vodafone') {
        success = await this.vodafoneSmsService.sendSms({
          to: testData.to,
          message: testData.message,
        });
        provider = success ? 'vodafone' : provider;
      }

      return {
        success,
        provider,
        message: success ? 'SMS sent successfully' : 'SMS sending failed',
        to: testData.to,
      };
    } catch (error) {
      throw new BadRequestException(`SMS test failed: ${error.message}`);
    }
  }

  /**
   * Get Vodafone SMS service information
   */
  @Get('sms/vodafone/info')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Vodafone SMS service information',
    description: 'Retrieve configuration and status information for Vodafone SMS service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service info retrieved',
  })
  async getVodafoneServiceInfo() {
    try {
      const serviceInfo = this.vodafoneSmsService.getServiceInfo();
      return {
        success: true,
        data: serviceInfo,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get service info: ${error.message}`);
    }
  }

  /**
   * Test Vodafone SMS service connection
   */
  @Get('sms/vodafone/test-connection')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test Vodafone SMS service connection',
    description: 'Test connectivity and authentication with Vodafone SMS API',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
  })
  async testVodafoneConnection() {
    try {
      const isConnected = await this.vodafoneSmsService.testConnection();
      return {
        success: true,
        connected: isConnected,
        message: isConnected ? 'Service connected' : 'Service not available',
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Vodafone SMS account balance
   */
  @Get('sms/vodafone/balance')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Vodafone SMS account balance',
    description: 'Retrieve current SMS balance and account information from Vodafone',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved',
  })
  async getVodafoneBalance() {
    try {
      const balance = await this.vodafoneSmsService.getAccountBalance();
      return {
        success: true,
        data: balance,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send templated SMS via Vodafone
   */
  @Post('sms/vodafone/template')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin', 'client', 'operator')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send templated SMS via Vodafone',
    description: 'Send pre-defined template SMS messages via Vodafone service',
  })
  @ApiResponse({
    status: 201,
    description: 'Templated SMS sent',
  })
  async sendVodafoneTemplatedSms(
    @Body() data: {
      to: string;
      template: 'low_credit' | 'payment_received' | 'device_offline' | 'critical_alert' | 'otp';
      templateData: any;
    },
  ) {
    try {
      const success = await this.vodafoneSmsService.sendTemplatedSms(
        data.to,
        data.template,
        data.templateData,
      );
      return {
        success,
        message: success ? 'Templated SMS sent' : 'Failed to send templated SMS',
        template: data.template,
        to: data.to,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send templated SMS: ${error.message}`);
    }
  }

  /**
   * Check SMS delivery status
   */
  @Get('sms/vodafone/delivery-status/:requestId')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check SMS delivery status',
    description: 'Check the delivery status of a previously sent SMS message',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Request ID from the original SMS send response',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery status retrieved',
  })
  async checkSmsDeliveryStatus(@Param('requestId') requestId: string) {
    try {
      const status = await this.vodafoneSmsService.checkDeliveryStatus(requestId);
      return {
        success: true,
        data: status,
        requestId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Private helper methods

  private generateRoutingRecommendations(status: any, stats: any): string[] {
    const recommendations: string[] = [];

    // Check provider availability
    if (!status.vodafone.available && !status.twilio.available) {
      recommendations.push('No SMS providers are currently available. Check configuration.');
    } else if (!status.vodafone.available) {
      recommendations.push('Vodafone SMS service unavailable. Using Twilio for all messages.');
    } else if (!status.twilio.available) {
      recommendations.push('Twilio SMS service unavailable. Using Vodafone for all messages.');
    }

    // Configuration recommendations
    if (stats.config.deploymentRegion === 'egypt') {
      recommendations.push('Egypt deployment: Vodafone optimized for domestic, Twilio for international');
      
      if (stats.config.domesticProvider !== 'vodafone') {
        recommendations.push('Consider using Vodafone as domestic provider for better Egypt coverage');
      }
    } else if (stats.config.deploymentRegion === 'international') {
      recommendations.push('International deployment: Twilio optimized for global reach');
      
      if (stats.config.internationalProvider !== 'twilio') {
        recommendations.push('Consider using Twilio as international provider for global coverage');
      }
    } else {
      recommendations.push('Global deployment: Smart routing based on destination region');
    }

    // Fallback recommendations
    if (!stats.config.fallbackEnabled) {
      recommendations.push('Enable fallback routing for better reliability');
    } else {
      recommendations.push('Fallback routing enabled for high availability');
    }

    if (recommendations.length === 0) {
      recommendations.push('SMS routing is optimally configured');
    }

    return recommendations;
  }

  /**
   * Send SMS to all phone numbers associated with a client
   */
  @Post('sms/client/:clientId')
  @ApiBearerAuth()
  @Roles('super_user', 'admin', 'operator')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Send SMS to client phone numbers',
    description: 'Send SMS to all phone numbers associated with a specific client',
  })
  @ApiParam({
    name: 'clientId',
    description: 'ID of the client to send SMS to',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS sent to client phone numbers',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalNumbers: { type: 'number' },
        successfulSends: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              success: { type: 'boolean' },
              provider: { type: 'string' },
              region: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async sendSmsToClient(
    @Param('clientId') clientId: string,
    @Body() body: { message: string },
  ) {
    try {
      if (!body.message || body.message.trim() === '') {
        throw new BadRequestException('Message cannot be empty');
      }

      const result = await this.notificationsService.sendSmsToClient(clientId, body.message);

      return {
        success: result.success,
        totalNumbers: result.results.length,
        successfulSends: result.results.filter(r => r.success).length,
        results: result.results,
        message: result.success 
          ? 'SMS sent to client phone numbers' 
          : 'Failed to send SMS to any phone numbers',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send SMS to client: ${error.message}`);
    }
  }
}