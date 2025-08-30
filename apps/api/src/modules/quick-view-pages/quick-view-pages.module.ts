import { Module } from '@nestjs/common';
import { QuickViewPagesController } from './quick-view-pages.controller';
import { QuickViewPagesService } from './quick-view-pages.service';
import { CalculationEngine } from './calculation.engine';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule, // For JWT guards and user context
  ],
  controllers: [QuickViewPagesController],
  providers: [
    QuickViewPagesService,
    CalculationEngine, // Add calculation engine as a provider
  ],
  exports: [QuickViewPagesService, CalculationEngine], // Export both for potential use in other modules
})
export class QuickViewPagesModule {}