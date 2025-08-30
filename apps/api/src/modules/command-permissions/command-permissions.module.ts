import { Module } from '@nestjs/common';
import { CommandPermissionsController } from './command-permissions.controller';
import { CommandPermissionsService } from './command-permissions.service';
import { CommandPermissionsSeederService } from './command-permissions-seeder.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CommandPermissionsController],
  providers: [CommandPermissionsService, CommandPermissionsSeederService],
  exports: [CommandPermissionsService, CommandPermissionsSeederService],
})
export class CommandPermissionsModule {}