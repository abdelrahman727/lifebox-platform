import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DeviceAuditController } from './device-audit.controller';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { AuditModule } from '../../common/audit.module';

@Module({
  imports: [TelemetryModule, AuditModule],
  controllers: [DevicesController, DeviceAuditController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
