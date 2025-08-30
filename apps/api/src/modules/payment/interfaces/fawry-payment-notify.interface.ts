// src/modules/payment/interfaces/fawry-payment-notify.interface.ts

import { Transform } from 'class-transformer';

export class FawryPaymentNotifyDto {
  @Transform(({ obj }) => obj.RequestId)
  requestId: string;

  @Transform(({ obj }) => obj.AsyncRequestId)
  asyncRequestId: string;

  @Transform(({ obj }) => obj.Fptn)
  fptn: string;

  @Transform(({ obj }) => obj.Bnkptn)
  bnkptn?: string;

  @Transform(({ obj }) => obj.Bnkdtn)
  bnkdtn?: string;

  @Transform(({ obj }) => obj.Fcrn)
  fcrn?: string;

  @Transform(({ obj }) => obj.BillingAccount)
  billingAccount: string;

  @Transform(({ obj }) => obj.BillTypeCode)
  billTypeCode: string;

  @Transform(({ obj }) => obj.TerminalId)
  terminalId?: string;

  @Transform(({ obj }) => obj.ClientTerminalSeqId)
  clientTerminalSeqId?: string;

  @Transform(({ obj }) => obj.PaymentMethod)
  paymentMethod: string;

  @Transform(({ obj }) => obj.PaymentType)
  paymentType: string;

  @Transform(({ obj }) => obj.DeliveryMethod)
  deliveryMethod: string;

  @Transform(({ obj }) => obj.Amount)
  amount: number;

  @Transform(({ obj }) => obj.Currency)
  currency?: string;

  @Transform(({ obj }) => obj.IsRetry)
  isRetry?: boolean;

  @Transform(({ obj }) => obj.PaymentStatus)
  paymentStatus: string;

  @Transform(({ obj }) => obj.RequestTimestamp)
  requestTimestamp: string;

  customerData?: any;
}

export interface FawryPaymentNotificationRequest {
  requestId: string;
  asyncRequestId: string;
  fptn: string;
  bnkptn?: string;
  bnkdtn?: string;
  fcrn?: string;
  billingAccount: string;
  billTypeCode: string;
  terminalId?: string;
  clientTerminalSeqId?: string;
  paymentMethod: string;
  paymentType: string;
  deliveryMethod: string;
  amount: number;
  currency?: string;
  isRetry?: boolean;
  paymentStatus: string;
  requestTimestamp: string;
  customerData?: FawryPaymentCustomerData;
}

export interface FawryPaymentNotificationResponse {
  requestId: string;
  asyncRequestId: string;
  statusCode: number;
  statusDescription: string;
}

export interface FawryPaymentCustomerData {
  officialId?: string;
  officialIdType?: string;
  name?: string;
  middleName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  mobile?: string;
  email?: string;
}
