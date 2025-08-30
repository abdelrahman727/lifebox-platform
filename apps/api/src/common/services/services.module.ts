import { Module } from '@nestjs/common';
import { GranularCommandService } from './granular-command.service';
import { DatabaseModule } from '../../modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [GranularCommandService],
  exports: [GranularCommandService],
})
export class ServicesModule {}