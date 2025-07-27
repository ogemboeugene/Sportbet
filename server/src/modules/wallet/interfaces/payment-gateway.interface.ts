export interface PaymentRequest {
  amount: number
  currency: string
  userId: string
  email: string
  phone?: string
  description?: string
  metadata?: any
  callbackUrl?: string
  redirectUrl?: string
}

export interface PaymentResponse {
  success: boolean
  transactionId: string
  externalTransactionId?: string
  paymentUrl?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  message?: string
  metadata?: any
}

export interface WithdrawalRequest {
  amount: number
  currency: string
  userId: string
  email: string
  phone?: string
  bankAccount?: {
    accountNumber: string
    bankCode: string
    accountName: string
  }
  mobileWallet?: {
    phoneNumber: string
    provider: string
  }
  metadata?: any
}

export interface WithdrawalResponse {
  success: boolean
  transactionId: string
  externalTransactionId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  message?: string
  metadata?: any
}

export interface WebhookPayload {
  event: string
  data: any
  signature?: string
  timestamp?: string
}

export interface PaymentGateway {
  name: string
  supportedCurrencies: string[]
  supportedCountries: string[]
  
  // Deposit methods
  initiateDeposit(request: PaymentRequest): Promise<PaymentResponse>
  verifyDeposit(transactionId: string): Promise<PaymentResponse>
  
  // Withdrawal methods
  initiateWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse>
  verifyWithdrawal(transactionId: string): Promise<WithdrawalResponse>
  
  // Webhook handling
  handleWebhook(payload: WebhookPayload): Promise<{
    transactionId: string
    status: string
    amount?: number
    metadata?: any
  } | null>
  
  // Utility methods
  validateWebhookSignature(payload: string, signature: string): boolean
  getSupportedPaymentMethods(): string[]
}