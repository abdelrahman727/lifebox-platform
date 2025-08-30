import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditModule } from '../../common/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}