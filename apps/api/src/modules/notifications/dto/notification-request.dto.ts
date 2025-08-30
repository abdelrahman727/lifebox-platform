import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsObject, IsEmail, IsPhoneNumber, IsUUID } from 'class-validator';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationCategory {
  SYSTEM = 'system',
  DEVICE = 'device',
  PAYMENT = 'payment',
  ALARM = 'alarm',
  REPORT = 'report',
  MARKETING = 'marketing',
  MAINTENANCE = 'maintenance',
}

export enum NotificationTemplate {
  LOW_CREDIT = 'low_credit',
  PAYMENT_RECEIVED = 'payment_received',
  DEVICE_OFFLINE = 'device_offline',
  DEVICE_ONLINE = 'device_online',
  CRITICAL_ALARM = 'critical_alarm',
  MONTHLY_REPORT = 'monthly_report',
  MAINTENANCE_ALERT = 'maintenance_alert',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  SYSTEM_UPDATE = 'system_update',
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority = NotificationPriority.NORMAL;

  @ApiProperty({
    description: 'Notification category',
    enum: NotificationCategory,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Recipient user ID or client ID',
  })
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: 'Notification title/subject',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message/body',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data for the notification',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Schedule notification for later (ISO 8601 format)',
  })
  @IsOptional()
  @IsString()
  scheduleFor?: string;

  @ApiPropertyOptional({
    description: 'Attachments for email notifications',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class SendTemplatedNotificationDto {
  @ApiProperty({
    description: 'Notification template to use',
    enum: NotificationTemplate,
  })
  @IsEnum(NotificationTemplate)
  template: NotificationTemplate;

  @ApiProperty({
    description: 'Types of notifications to send',
    enum: NotificationType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types: NotificationType[];

  @ApiProperty({
    description: 'Recipient user ID or client ID',
  })
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: 'Template data/variables',
  })
  @IsObject()
  templateData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Schedule notification for later (ISO 8601 format)',
  })
  @IsOptional()
  @IsString()
  scheduleFor?: string;
}

export class BulkNotificationDto {
  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification category',
    enum: NotificationCategory,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Recipient IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  recipientIds: string[];

  @ApiProperty({
    description: 'Notification title/subject',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message/body',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data for the notification',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Rate limiting delay between notifications (ms)',
    default: 500,
  })
  @IsOptional()
  delayMs?: number;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable SMS notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable in-app notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Email address for notifications',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number for SMS notifications',
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Categories to receive notifications for',
    enum: NotificationCategory,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationCategory, { each: true })
  enabledCategories?: NotificationCategory[];

  @ApiPropertyOptional({
    description: 'Minimum priority level for notifications',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  minimumPriority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Quiet hours settings',
  })
  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled: boolean;
    startTime: string; // Format: "22:00"
    endTime: string; // Format: "08:00"
    timezone: string;
  };
}

export class CreateNotificationTemplateDto {
  @ApiProperty({
    description: 'Template identifier',
  })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: 'Template name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template category',
    enum: NotificationCategory,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Email subject template',
  })
  @IsString()
  emailSubject: string;

  @ApiProperty({
    description: 'Email HTML template',
  })
  @IsString()
  emailHtml: string;

  @ApiProperty({
    description: 'SMS message template',
  })
  @IsString()
  smsMessage: string;

  @ApiPropertyOptional({
    description: 'Template variables description',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Default priority for this template',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  defaultPriority?: NotificationPriority;
}