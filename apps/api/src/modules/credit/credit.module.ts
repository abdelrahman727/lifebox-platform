import { Module } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [CreditController],
})
export class CreditModule {}
