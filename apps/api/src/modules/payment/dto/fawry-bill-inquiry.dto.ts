// src/modules/payment/dto/fawry-bill-inquiry.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Bill Inquiry Request DTOs
export class ExtraBillingAcctDto {
  @ApiProperty({ enum: ['Key1', 'Key2', 'Key3', 'Key4', 'Key5'] })
  @IsString()
  key: string;

  @ApiProperty({ maxLength: 16 })
  @IsString()
  value: string;
}

export class CustomPropertyDto {
  @ApiProperty({ maxLength: 32 })
  @IsString()
  key: string;

  @ApiProperty({ maxLength: 256 })
  @IsString()
  value: string;
}

export class FawryBillInquiryDto {
  @ApiProperty({ default: 'BillInqRq' })
  @IsString()
  msgCode: string = 'BillInqRq';

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiProperty()
  @IsString()
  receiver: string;

  @ApiPropertyOptional({ enum: ['ar-eg', 'en-gb'] })
  @IsOptional()
  @IsString()
  custLang?: string;

  @ApiProperty({ description: 'Format: yyyy-MM-ddTHH:mm:ss.S' })
  @IsString()
  clientDt: string;

  @ApiProperty({ description: 'GUID from channel' })
  @IsString()
  rqUID: string;

  @ApiProperty({ description: 'GUID from Fawry' })
  @IsString()
  asyncRqUID: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiProperty()
  @IsString()
  billingAcct: string;

  @ApiProperty({ description: 'CSP Code' })
  @IsString()
  bankId: string;

  @ApiProperty({ description: 'Service Code' })
  @IsString()
  billTypeCode: string;

  @ApiProperty({ enum: ['ATM', 'POS', 'INT', 'MOB', 'IVR'] })
  @IsString()
  deliveryMethod: string;

  @ApiPropertyOptional({ type: [ExtraBillingAcctDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraBillingAcctDto)
  extraBillingAccts?: ExtraBillingAcctDto[];

  @ApiPropertyOptional({ type: [CustomPropertyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPropertyDto)
  customProperties?: CustomPropertyDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}

// Bill Inquiry Response DTOs
export class StatusDto {
  @ApiProperty()
  @IsNumber()
  statusCode: number;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BillAmountDto {
  @ApiProperty()
  @IsNumber()
  amt: number;

  @ApiPropertyOptional({ default: 'EGP' })
  @IsOptional()
  @IsString()
  curCode?: string = 'EGP';
}

export class BillInfoDto {
  @ApiProperty({ type: BillAmountDto })
  @ValidateNested()
  @Type(() => BillAmountDto)
  billAmt: BillAmountDto;

  @ApiPropertyOptional({ description: 'Format: yyyy-MM-dd' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Format: yyyy-MM-dd' })
  @IsOptional()
  @IsDateString()
  expDate?: string;

  @ApiPropertyOptional({ description: 'Format: yyyy-MM-dd' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  extraBillInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billLabel?: string;
}

export class BillRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billNumber?: string;

  @ApiProperty()
  @IsString()
  billingAcct: string;

  @ApiPropertyOptional({ type: [ExtraBillingAcctDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraBillingAcctDto)
  extraBillingAccts?: ExtraBillingAcctDto[];

  @ApiProperty()
  @IsString()
  billTypeCode: string;

  @ApiPropertyOptional({ type: [CustomPropertyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPropertyDto)
  billCustomProperties?: CustomPropertyDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextBTC?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allowPayment?: string;

  @ApiProperty({ type: BillInfoDto })
  @ValidateNested()
  @Type(() => BillInfoDto)
  billInfo: BillInfoDto;
}

export class FawryBillInquiryResponseDto {
  @ApiProperty({ type: StatusDto })
  @ValidateNested()
  @Type(() => StatusDto)
  status: StatusDto;

  @ApiProperty({ default: 'BillInqRs' })
  @IsString()
  msgCode: string = 'BillInqRs';

  @ApiPropertyOptional({ enum: ['ar-eg', 'en-gb'] })
  @IsOptional()
  @IsString()
  serverLang?: string;

  @ApiProperty()
  @IsString()
  serverDt: string;

  @ApiProperty()
  @IsString()
  rqUID: string;

  @ApiProperty()
  @IsString()
  asyncRqUID: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ type: [CustomPropertyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPropertyDto)
  customProperties?: CustomPropertyDto[];

  @ApiProperty({ type: [BillRecordDto], nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillRecordDto)
  billRec: BillRecordDto[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}

// Payment Notify Request DTOs
export class PaymentAmountDto {
  @ApiProperty()
  @IsNumber()
  amt: number;

  @ApiPropertyOptional({ default: 'EGP' })
  @IsOptional()
  @IsString()
  curCode?: string = 'EGP';
}

export class PaymentIdDto {
  @ApiProperty({ maxLength: 36 })
  @IsString()
  pmtId: string;

  @ApiProperty({ enum: ['FPTN', 'BNKPTN', 'BNKDTN', 'FCRN'] })
  @IsString()
  pmtIdType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creationDt?: string;
}

export class PaymentRevInfoDto {
  @ApiProperty()
  @IsString()
  pmtId: string;

  @ApiProperty()
  @IsString()
  creationDt: string;
}

export class DepAccIdFromDto {
  @ApiProperty()
  @IsString()
  acctId: string;

  @ApiProperty()
  @IsString()
  acctType: string;
}

export class PaymentInfoDto {
  @ApiProperty({ maxLength: 16 })
  @IsString()
  billingAcct: string;

  @ApiPropertyOptional({ type: [ExtraBillingAcctDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraBillingAcctDto)
  extraBillingAccts?: ExtraBillingAcctDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billRefNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billNumber?: string;

  @ApiProperty()
  @IsNumber()
  billTypeCode: number;

  @ApiProperty()
  @IsString()
  bankId: string;

  @ApiProperty({ enum: ['POST', 'PREP', 'VOCH'] })
  @IsString()
  pmtType: string;

  @ApiProperty({ maxLength: 3 })
  @IsString()
  deliveryMethod: string;

  @ApiProperty({ enum: ['CASH', 'CCARD'] })
  @IsString()
  pmtMethod: string;

  @ApiProperty({ type: PaymentAmountDto })
  @ValidateNested()
  @Type(() => PaymentAmountDto)
  pmtAmt: PaymentAmountDto;

  @ApiProperty({ enum: ['PmtNew', 'PmtReversal'] })
  @IsString()
  pmtStatus: string;

  @ApiPropertyOptional({ type: PaymentRevInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentRevInfoDto)
  pmtRevInfo?: PaymentRevInfoDto;

  @ApiProperty({ type: [PaymentIdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentIdDto)
  pmtIds: PaymentIdDto[];

  @ApiPropertyOptional({ type: DepAccIdFromDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DepAccIdFromDto)
  depAccIdFrom?: DepAccIdFromDto;
}

export class PaymentRecordDto {
  @ApiProperty({ type: PaymentInfoDto })
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  pmtInfo: PaymentInfoDto;
}

// Customer Data DTOs
export class CustIdDto {
  @ApiProperty()
  @IsString()
  OfficialId: string;

  @ApiProperty()
  @IsString()
  OfficialIdType: string;
}

export class ContactInfoDto {
  @ApiProperty()
  @IsString()
  contactType: string;

  @ApiProperty()
  @IsString()
  contactValue: string;
}

export class CustomerDataDto {
  @ApiPropertyOptional({ type: [CustIdDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustIdDto)
  custIds?: CustIdDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['M', 'F'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ type: [ContactInfoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto[];
}

export class FawryPaymentNotifyDto {
  @ApiProperty({ default: 'PmtNotifyRq' })
  @IsString()
  msgCode: string = 'PmtNotifyRq';

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiProperty()
  @IsString()
  receiver: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custLang?: string;

  @ApiProperty()
  @IsString()
  clientDt: string;

  @ApiProperty()
  @IsBoolean()
  isRetry: boolean;

  @ApiProperty()
  @IsString()
  rqUID: string;

  @ApiProperty()
  @IsString()
  asyncRqUID: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTerminalSeqId?: string;

  @ApiPropertyOptional({ type: [CustomPropertyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPropertyDto)
  customProperties?: CustomPropertyDto[];

  @ApiProperty({ type: [PaymentRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentRecordDto)
  pmtRec: PaymentRecordDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ type: CustomerDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDataDto)
  custData?: CustomerDataDto;
}

// Payment Notify Response DTOs
export class VoucherInfoDto {
  @ApiProperty()
  @IsString()
  vouchSN: string;

  @ApiProperty()
  @IsString()
  vouchPIN: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vouchExpDt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vouchShrtExpDt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vouchDesc?: string;
}

export class BalanceAmountDto {
  @ApiProperty()
  @IsNumber()
  amt: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  curCode?: string;
}

export class PaymentStatusRecordDto {
  @ApiProperty({ type: StatusDto })
  @ValidateNested()
  @Type(() => StatusDto)
  status: StatusDto;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  extraBillInfo?: string;

  @ApiProperty({ type: [PaymentIdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentIdDto)
  pmtIds: PaymentIdDto[];

  @ApiPropertyOptional({ type: VoucherInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VoucherInfoDto)
  voucherInfo?: VoucherInfoDto;

  @ApiPropertyOptional({ type: BalanceAmountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BalanceAmountDto)
  balanceAmt?: BalanceAmountDto;
}

export class FawryPaymentNotifyResponseDto {
  @ApiProperty({ type: StatusDto })
  @ValidateNested()
  @Type(() => StatusDto)
  status: StatusDto;

  @ApiProperty({ default: 'PmtNotifyRs' })
  @IsString()
  msgCode: string = 'PmtNotifyRs';

  @ApiProperty()
  @IsString()
  serverDt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rqUID?: string;

  @ApiProperty()
  @IsString()
  asyncRqUID: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTerminalSeqId?: string;

  @ApiPropertyOptional({ type: [CustomPropertyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPropertyDto)
  customProperties?: CustomPropertyDto[];

  @ApiProperty({ type: [PaymentStatusRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentStatusRecordDto)
  pmtStatusRec: PaymentStatusRecordDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRetry?: boolean;
}