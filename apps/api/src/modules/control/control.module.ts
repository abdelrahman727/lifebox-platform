
// src/modules/control/control.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentModule } from '../payment/payment.module';
import { ServicesModule } from '../../common/services/services.module';
import { ControlCommandController } from './control-command.controller';

@Module({
  imports: [
    DatabaseModule,
    PaymentModule, // Import to use CreditMonitorService
    ServicesModule, // Import to use GranularCommandService
  ],
  controllers: [ControlCommandController],
  providers: [],
  exports: [],
})
export class ControlModule {}