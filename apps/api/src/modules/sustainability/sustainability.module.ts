import { Module } from '@nestjs/common';
import { SustainabilityController } from './sustainability.controller';
import { SustainabilityService } from './sustainability.service';
import { DatabaseModule } from '../database/database.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { CustomCalculationsModule } from '../custom-calculations/custom-calculations.module';

@Module({
  imports: [DatabaseModule, ExchangeRatesModule, CustomCalculationsModule],
  controllers: [SustainabilityController],
  providers: [SustainabilityService],
  exports: [SustainabilityService],
})
export class SustainabilityModule {}