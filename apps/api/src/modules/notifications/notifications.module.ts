// src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { VodafoneSmsService } from './vodafone-sms.service';
import { HybridSmsRouterService } from './hybrid-sms-router.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService, 
    EmailService, 
    SmsService, 
    VodafoneSmsService, 
    HybridSmsRouterService
  ],
  exports: [
    NotificationsService, 
    EmailService, 
    SmsService, 
    VodafoneSmsService, 
    HybridSmsRouterService
  ],
})
export class NotificationsModule {}