import { Module } from '@nestjs/common';
import { UserAssignmentsController } from './user-assignments.controller';
import { UserAssignmentsService } from './user-assignments.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserAssignmentsController],
  providers: [UserAssignmentsService],
  exports: [UserAssignmentsService],
})
export class UserAssignmentsModule {}