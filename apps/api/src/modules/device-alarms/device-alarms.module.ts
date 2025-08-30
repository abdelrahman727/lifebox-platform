import { Module } from '@nestjs/common';
import { DeviceAlarmsController } from './device-alarms.controller';
import { DeviceAlarmsService } from './device-alarms.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DeviceAlarmsController],
  providers: [DeviceAlarmsService],
  exports: [DeviceAlarmsService],
})
export class DeviceAlarmsModule {}