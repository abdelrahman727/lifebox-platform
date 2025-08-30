// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Database
import { DatabaseModule } from './modules/database/database.module';

// Auth
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Feature Modules
import { ClientsModule } from './modules/clients/clients.module';
import { DevicesModule } from './modules/devices/devices.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AlarmsModule } from './modules/alarms/alarms.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CreditModule } from './modules/credit/credit.module';
import { ControlModule } from './modules/control/control.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SustainabilityModule } from './modules/sustainability/sustainability.module';
import { FilesModule } from './modules/files/files.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { CustomCalculationsModule } from './modules/custom-calculations/custom-calculations.module';
import { CommandTemplateModule } from './modules/control/command-template.module';
import { UserAssignmentsModule } from './modules/user-assignments/user-assignments.module';
import { CommandPermissionsModule } from './modules/command-permissions/command-permissions.module';
import { QuickViewPagesModule } from './modules/quick-view-pages/quick-view-pages.module';
import { DeviceAlarmsModule } from './modules/device-alarms/device-alarms.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './common/services/services.module';
import { AuditModule } from './common/audit.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Database
    DatabaseModule,

    // Auth
    AuthModule,

    // Feature Modules
    ClientsModule,
    DevicesModule,
    TelemetryModule,
    AlarmsModule,
    HealthModule,
    PaymentModule,
    CreditModule,
    ControlModule, 
    NotificationsModule,
    RealtimeModule,
    ReportsModule,
    SustainabilityModule,
    FilesModule,
    DashboardModule,
    ExchangeRatesModule,
    CustomCalculationsModule,
    CommandTemplateModule,
    UserAssignmentsModule,
    CommandPermissionsModule,
    QuickViewPagesModule,
    DeviceAlarmsModule,
    UsersModule,
    ServicesModule,
    AuditModule,
    AuditLogsModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
