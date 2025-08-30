import { Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { MetadataContextController } from './metadata-context.controller';
import { UnknownFieldsController } from './unknown-fields.controller';
import { DeviceMetadataContextService } from './device-metadata-context.service';
import { AlarmsModule } from '../alarms/alarms.module';

@Module({
  imports: [AlarmsModule],
  controllers: [TelemetryController, MetadataContextController, UnknownFieldsController],
  providers: [TelemetryService, DeviceMetadataContextService],
  exports: [TelemetryService, DeviceMetadataContextService],
})
export class TelemetryModule {}
