import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EnhancedUserCreationService } from './enhanced-user-creation.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, EnhancedUserCreationService],
  exports: [UsersService, EnhancedUserCreationService],
})
export class UsersModule {}