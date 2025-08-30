import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date(),
        services: {
          api: 'operational',
          database: 'operational',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        services: {
          api: 'operational',
          database: 'down',
        },
      };
    }
  }
}
