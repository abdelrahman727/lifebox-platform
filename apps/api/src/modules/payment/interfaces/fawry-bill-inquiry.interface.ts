// src/modules/payment/interfaces/fawry-bill-inquiry.interface.ts

export interface FawryBillInquiryRequest {
  requestId: string;
  asyncRequestId: string;
  billingAccount: string;
  billTypeCode: string;
  terminalId?: string;
  deliveryMethod?: string;
  requestTimestamp: string;
}

export interface FawryBillInquiryResponse {
  requestId: string;
  asyncRequestId: string;
  statusCode: number;
  statusDescription: string;
  billAmount: number;
  currency: string;
  billTypeCode: string;
  billingAccount: string;
  dueDate?: string | null;
  extraBills: FawryExtraBill[];
  customerData?: FawryBillCustomerData | null;
}

export interface FawryExtraBill {
  billAmount: number;
  currency: string;
  billTypeCode: string;
  dueDate?: string;
  description?: string;
}

export interface FawryBillCustomerData {
  name?: string;
  organizationName?: string;
  billingType?: string;
  currentCredit?: number;
  lastPaymentDate?: string;
  accountStatus?: string;
}

// Fawry API Configuration
export interface FawryConfig {
  baseUrl: string;
  merchantCode: string;
  securityKey: string;
  billTypeCode: string;
  timeout?: number;
  retries?: number;
}

// Internal interfaces for payment processing
export interface PaymentProcessingResult {
  success: boolean;
  transactionId?: string;
  creditTransaction?: any;
  errorMessage?: string;
  statusCode: number;
}

export interface BillCalculationContext {
  clientId: string;
  billingType: 'prepaid' | 'postpaid';
  currentCredit: number;
  customPricing?: CustomerPricingInfo;
  usagePeriod?: UsagePeriodInfo;
}

export interface CustomerPricingInfo {
  pricingType: 'energy' | 'water_flow';
  rateValue: number;
  perUnit: number;
  unitType: 'kwh' | 'm3_per_hr';
}

export interface UsagePeriodInfo {
  startDate: Date;
  endDate: Date;
  totalEnergyKwh: number;
  totalWaterM3: number;
  estimatedCost: number;
}

// Fawry webhook signature verification
export interface FawrySignatureData {
  fptn: string;
  amount: number;
  billingAccount: string;
  paymentMethod: string;
  securityKey: string;
}

// Error handling interfaces
export interface FawryErrorResponse {
  requestId: string;
  asyncRequestId: string;
  statusCode: number;
  statusDescription: string;
  errorCode?: string;
  errorDetails?: string[];
  timestamp: string;
}

export interface FawryApiError extends Error {
  statusCode: number;
  errorCode?: string;
  response?: any;
  request?: any;
}

// Event interfaces for internal messaging
export interface PaymentReceivedEvent {
  clientId: string;
  amount: number;
  fptn: string;
  paymentMethod: string;
  timestamp: Date;
  customerData?: FawryBillCustomerData;
}

export interface CreditUpdatedEvent {
  clientId: string;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  transactionType: 'deposit' | 'usage' | 'refund';
  transactionId: string;
  timestamp: Date;
}

export interface LowBalanceAlertEvent {
  clientId: string;
  currentBalance: number;
  threshold: number;
  clientName: string;
  contactEmails: string[];
  contactPhones: string[];
  timestamp: Date;
}

// Query interfaces for data retrieval
export interface PaymentHistoryQuery {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  paymentMethod?: string;
  paymentStatus?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'amount' | 'date' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreditTransactionQuery {
  clientId: string;
  transactionType?: 'deposit' | 'usage' | 'refund';
  startDate?: Date;
  endDate?: Date;
  referenceId?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

// Analytics interfaces
export interface PaymentAnalytics {
  totalPayments: number;
  totalAmount: number;
  averagePayment: number;
  paymentsByMethod: Record<string, { count: number; amount: number }>;
  paymentsByDay: Array<{ date: string; count: number; amount: number }>;
  successRate: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface CreditAnalytics {
  totalDeposits: number;
  totalUsage: number;
  totalRefunds: number;
  averageBalance: number;
  balanceDistribution: Array<{ range: string; count: number }>;
  usageByDay: Array<{ date: string; usage: number }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

// Validation interfaces
export interface FawryRequestValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PaymentValidation extends FawryRequestValidation {
  isDuplicate: boolean;
  signatureValid: boolean;
  amountValid: boolean;
  clientExists: boolean;
}

export interface BillInquiryValidation extends FawryRequestValidation {
  clientExists: boolean;
  billingAccountValid: boolean;
  billTypeSupported: boolean;
}