import { Module } from '@nestjs/common';
import { CommandTemplateService } from './command-template.service';
import { CommandTemplateController } from './command-template.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CommandTemplateController],
  providers: [CommandTemplateService],
  exports: [CommandTemplateService],
})
export class CommandTemplateModule {}