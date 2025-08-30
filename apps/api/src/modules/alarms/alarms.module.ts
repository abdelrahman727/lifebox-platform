import { Module } from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { AlarmProcessorService } from './alarm-processor.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, PaymentModule],
  controllers: [AlarmsController],
  providers: [AlarmsService, AlarmProcessorService],
  exports: [AlarmsService, AlarmProcessorService],
})
export class AlarmsModule {}
