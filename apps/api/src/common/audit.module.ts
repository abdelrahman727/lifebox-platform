import { Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Module({
  providers: [AuditLogService, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditModule {}