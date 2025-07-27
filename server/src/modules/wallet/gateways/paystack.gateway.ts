import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import * as crypto from 'crypto'
import {
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  WebhookPayload,
} from '../interfaces/payment-gateway.interface'

@Injectable()
export class PaystackGateway implements PaymentGateway {
  name = 'paystack'
  supportedCurrencies = ['NGN', 'USD', 'GHS', 'ZAR']
  supportedCountries = ['NG', 'GH', 'ZA']

  private readonly logger = new Logger(PaystackGateway.name)
  private readonly client: AxiosInstance
  private readonly secretKey: string
  private readonly publicKey: string

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''
    this.publicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY') || ''

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async initiateDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        email: request.email,
        amount: Math.round(request.amount * 100), // Paystack uses kobo/cents
        currency: request.currency,
        reference: `dep_${Date.now()}_${request.userId}`,
        callback_url: request.callbackUrl || `${this.configService.get('API_URL')}/wallet/webhooks/paystack`,
        metadata: {
          userId: request.userId,
          ...request.metadata,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }

      const response = await this.client.post('/transaction/initialize', payload)

      if (response.data.status) {
        return {
          success: true,
          transactionId: payload.reference,
          externalTransactionId: response.data.data.reference,
          paymentUrl: response.data.data.authorization_url,
          status: 'pending',
          message: 'Payment initiated successfully',
          metadata: response.data.data,
        }
      } else {
        throw new Error(response.data.message || 'Payment initiation failed')
      }
    } catch (error: any) {
      this.logger.error('Paystack deposit initiation failed', error)
      return {
        success: false,
        transactionId: `dep_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Payment initiation failed',
      }
    }
  }

  async verifyDeposit(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.client.get(`/transaction/verify/${transactionId}`)

      if (response.data.status) {
        const transaction = response.data.data
        
        let status: PaymentResponse['status'] = 'pending'
        if (transaction.status === 'success') {
          status = 'completed'
        } else if (transaction.status === 'failed') {
          status = 'failed'
        } else if (transaction.status === 'abandoned') {
          status = 'cancelled'
        }

        return {
          success: transaction.status === 'success',
          transactionId,
          externalTransactionId: transaction.reference,
          status,
          message: transaction.gateway_response || 'Transaction verified',
          metadata: transaction,
        }
      } else {
        throw new Error(response.data.message || 'Transaction verification failed')
      }
    } catch (error: any) {
      this.logger.error('Paystack deposit verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Transaction verification failed',
      }
    }
  }

  async initiateWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    try {
      // First, create a transfer recipient
      const recipientPayload: any = {
        type: 'nuban',
        name: request.bankAccount?.accountName || 'Account Holder',
        account_number: request.bankAccount?.accountNumber,
        bank_code: request.bankAccount?.bankCode,
        currency: request.currency,
      }

      // Handle mobile money recipients
      if (request.mobileWallet) {
        recipientPayload.type = 'mobile_money'
        recipientPayload.account_number = request.mobileWallet.phoneNumber
        recipientPayload.bank_code = this.getMobileMoneyBankCode(request.mobileWallet.provider)
      }

      const recipientResponse = await this.client.post('/transferrecipient', recipientPayload)

      if (!recipientResponse.data.status) {
        throw new Error(recipientResponse.data.message || 'Failed to create transfer recipient')
      }

      const recipientCode = recipientResponse.data.data.recipient_code

      // Now initiate the transfer
      const transferPayload = {
        source: 'balance',
        amount: Math.round(request.amount * 100), // Paystack uses kobo/cents
        recipient: recipientCode,
        reason: 'Wallet withdrawal',
        reference: `wit_${Date.now()}_${request.userId}`,
      }

      const transferResponse = await this.client.post('/transfer', transferPayload)

      if (transferResponse.data.status) {
        return {
          success: true,
          transactionId: transferPayload.reference,
          externalTransactionId: transferResponse.data.data.transfer_code,
          status: 'processing',
          message: 'Withdrawal initiated successfully',
          metadata: transferResponse.data.data,
        }
      } else {
        throw new Error(transferResponse.data.message || 'Withdrawal initiation failed')
      }
    } catch (error: any) {
      this.logger.error('Paystack withdrawal initiation failed', error)
      return {
        success: false,
        transactionId: `wit_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Withdrawal initiation failed',
      }
    }
  }

  async verifyWithdrawal(transactionId: string): Promise<WithdrawalResponse> {
    try {
      // Get all transfers and find by reference
      const response = await this.client.get('/transfer')

      if (response.data.status) {
        const transfer = response.data.data.find((t: any) => t.reference === transactionId)
        
        if (!transfer) {
          throw new Error('Transfer not found')
        }

        let status: WithdrawalResponse['status'] = 'processing'
        if (transfer.status === 'success') {
          status = 'completed'
        } else if (transfer.status === 'failed') {
          status = 'failed'
        } else if (transfer.status === 'reversed') {
          status = 'cancelled'
        }

        return {
          success: transfer.status === 'success',
          transactionId,
          externalTransactionId: transfer.transfer_code,
          status,
          message: transfer.reason || 'Transfer verified',
          metadata: transfer,
        }
      } else {
        throw new Error('Failed to fetch transfers')
      }
    } catch (error: any) {
      this.logger.error('Paystack withdrawal verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Transfer verification failed',
      }
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<{
    transactionId: string
    status: string
    amount?: number
    metadata?: any
  } | null> {
    const { event, data } = payload

    switch (event) {
      case 'charge.success':
        return {
          transactionId: data.reference,
          status: 'completed',
          amount: data.amount / 100, // Convert from kobo/cents
          metadata: data,
        }

      case 'charge.failed':
        return {
          transactionId: data.reference,
          status: 'failed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.success':
        return {
          transactionId: data.reference,
          status: 'completed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.failed':
        return {
          transactionId: data.reference,
          status: 'failed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.reversed':
        return {
          transactionId: data.reference,
          status: 'cancelled',
          amount: data.amount / 100,
          metadata: data,
        }

      default:
        this.logger.warn(`Unhandled Paystack webhook event: ${event}`)
        return null
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload, 'utf8')
      .digest('hex')

    return hash === signature
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'bank_transfer',
      'ussd',
      'qr',
      'mobile_money',
      'bank',
    ]
  }

  private getMobileMoneyBankCode(provider: string): string {
    const codes = {
      'mtn': 'MTN',
      'vodafone': 'VDF',
      'airtel': 'ATL',
      'tigo': 'TGO',
    }
    return codes[provider.toLowerCase()] || 'MTN'
  }
}