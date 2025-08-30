import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreditService } from '../payment/services/credit.service';

@ApiTags('credit')
@Controller('credit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get(':clientId')
  @ApiOperation({ summary: 'Get client credit balance' })
  async getClientCredit(@Param('clientId') clientId: string) {
    const client = await this.creditService.getClientByFawryId(clientId);
    return {
      clientId: client.id,
      fawryPaymentId: client.fawryPaymentId,
      name: client.name,
      credit: client.credit,
      billingType: client.billingType,
    };
  }
}
