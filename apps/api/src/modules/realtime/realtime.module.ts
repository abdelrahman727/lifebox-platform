// src/modules/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime-simple.service';
import { RealtimeController } from './realtime.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    // Set up cross-references
    this.realtimeService.setGateway(this.realtimeGateway);
  }
}