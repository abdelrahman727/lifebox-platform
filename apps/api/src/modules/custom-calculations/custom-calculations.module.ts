import { Module } from '@nestjs/common';
import { CustomCalculationsController } from './custom-calculations.controller';
import { CustomCalculationsService } from './custom-calculations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomCalculationsController],
  providers: [CustomCalculationsService],
  exports: [CustomCalculationsService],
})
export class CustomCalculationsModule {}