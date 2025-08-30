// src/modules/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

// Controllers
import { FawryController } from './fawry.controller';
import { PaymentController } from './payment.controller';
import { PricingController } from './pricing.controller';
import { AdminController } from './admin.controller';

// Services
import { FawryService } from './services/fawry.service';
import { CreditService } from './services/credit.service';
import { CreditMonitorService } from './services/credit-monitor.service';
import { FawryQueryService } from './services/fawry-query.service';
import { ReconciliationService } from './services/reconciliation.service';
import { DeviceControlService } from './services/device-control.service';
import { SystemSettingsService } from './services/system-settings.service';
import { TemplateService } from './services/template.service';

// Scheduler
import { PaymentSchedulerService } from './payment-scheduler.service';

// Configuration
import { fawryConfig } from './config/fawry.config';

@Module({
  imports: [
    ConfigModule.forFeature(fawryConfig),
    ScheduleModule.forRoot(),
    DatabaseModule,
    NotificationsModule,
  ],
  controllers: [
    FawryController,
    PaymentController,
    PricingController,
    AdminController,
  ],
  providers: [
    FawryService,
    CreditService,
    CreditMonitorService,
    FawryQueryService,
    ReconciliationService,
    PaymentSchedulerService,
    DeviceControlService,
    SystemSettingsService,
    TemplateService,
  ],
  exports: [
    FawryService,
    CreditService,
    CreditMonitorService,
    FawryQueryService,
    ReconciliationService,
    DeviceControlService,
    SystemSettingsService,
    TemplateService,
  ],
})
export class PaymentModule {}