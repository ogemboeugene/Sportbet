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
export class FlutterwaveGateway implements PaymentGateway {
  name = 'flutterwave'
  supportedCurrencies = ['NGN', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS', 'ZAR']
  supportedCountries = ['NG', 'KE', 'UG', 'TZ', 'ZA', 'GH', 'RW']

  private readonly logger = new Logger(FlutterwaveGateway.name)
  private readonly client: AxiosInstance
  private readonly secretKey: string
  private readonly publicKey: string
  private readonly webhookSecret: string

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY') || ''
    this.publicKey = this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY') || ''
    this.webhookSecret = this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET') || ''

    this.client = axios.create({
      baseURL: 'https://api.flutterwave.com/v3',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async initiateDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        tx_ref: `dep_${Date.now()}_${request.userId}`,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.redirectUrl || `${this.configService.get('CLIENT_URL')}/wallet?status=success`,
        customer: {
          email: request.email,
          phone_number: request.phone,
          name: request.email.split('@')[0],
        },
        customizations: {
          title: 'Deposit to Wallet',
          description: request.description || 'Wallet deposit',
          logo: `${this.configService.get('CLIENT_URL')}/logo.png`,
        },
        meta: {
          userId: request.userId,
          ...request.metadata,
        },
      }

      const response = await this.client.post('/payments', payload)

      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: payload.tx_ref,
          externalTransactionId: response.data.data.id.toString(),
          paymentUrl: response.data.data.link,
          status: 'pending',
          message: 'Payment initiated successfully',
          metadata: response.data.data,
        }
      } else {
        throw new Error(response.data.message || 'Payment initiation failed')
      }
    } catch (error) {
      this.logger.error('Flutterwave deposit initiation failed', error)
      return {
        success: false,
        transactionId: `dep_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.message || 'Payment initiation failed',
      }
    }
  }

  async verifyDeposit(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.client.get(`/transactions/verify_by_reference?tx_ref=${transactionId}`)

      if (response.data.status === 'success') {
        const transaction = response.data.data
        
        let status: PaymentResponse['status'] = 'pending'
        if (transaction.status === 'successful') {
          status = 'completed'
        } else if (transaction.status === 'failed') {
          status = 'failed'
        } else if (transaction.status === 'cancelled') {
          status = 'cancelled'
        }

        return {
          success: transaction.status === 'successful',
          transactionId,
          externalTransactionId: transaction.id.toString(),
          status,
          message: transaction.processor_response || 'Transaction verified',
          metadata: transaction,
        }
      } else {
        throw new Error(response.data.message || 'Transaction verification failed')
      }
    } catch (error) {
      this.logger.error('Flutterwave deposit verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.message || 'Transaction verification failed',
      }
    }
  }

  async initiateWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    try {
      let payload: any = {
        account_bank: request.bankAccount?.bankCode,
        account_number: request.bankAccount?.accountNumber,
        amount: request.amount,
        currency: request.currency,
        narration: 'Wallet withdrawal',
        reference: `wit_${Date.now()}_${request.userId}`,
        callback_url: `${this.configService.get('API_URL')}/wallet/webhooks/flutterwave`,
        debit_currency: request.currency,
      }

      // Handle mobile money withdrawals
      if (request.mobileWallet) {
        payload = {
          ...payload,
          account_bank: this.getMobileMoneyBankCode(request.mobileWallet.provider),
          account_number: request.mobileWallet.phoneNumber,
        }
      }

      const response = await this.client.post('/transfers', payload)

      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: payload.reference,
          externalTransactionId: response.data.data.id.toString(),
          status: 'processing',
          message: 'Withdrawal initiated successfully',
          metadata: response.data.data,
        }
      } else {
        throw new Error(response.data.message || 'Withdrawal initiation failed')
      }
    } catch (error) {
      this.logger.error('Flutterwave withdrawal initiation failed', error)
      return {
        success: false,
        transactionId: `wit_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.message || 'Withdrawal initiation failed',
      }
    }
  }

  async verifyWithdrawal(transactionId: string): Promise<WithdrawalResponse> {
    try {
      const response = await this.client.get(`/transfers?reference=${transactionId}`)

      if (response.data.status === 'success' && response.data.data.length > 0) {
        const transfer = response.data.data[0]
        
        let status: WithdrawalResponse['status'] = 'processing'
        if (transfer.status === 'SUCCESSFUL') {
          status = 'completed'
        } else if (transfer.status === 'FAILED') {
          status = 'failed'
        }

        return {
          success: transfer.status === 'SUCCESSFUL',
          transactionId,
          externalTransactionId: transfer.id.toString(),
          status,
          message: transfer.complete_message || 'Transfer verified',
          metadata: transfer,
        }
      } else {
        throw new Error('Transfer not found')
      }
    } catch (error) {
      this.logger.error('Flutterwave withdrawal verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.message || 'Transfer verification failed',
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
      case 'charge.completed':
        return {
          transactionId: data.tx_ref,
          status: data.status === 'successful' ? 'completed' : 'failed',
          amount: data.amount,
          metadata: data,
        }

      case 'transfer.completed':
        return {
          transactionId: data.reference,
          status: data.status === 'SUCCESSFUL' ? 'completed' : 'failed',
          amount: data.amount,
          metadata: data,
        }

      default:
        this.logger.warn(`Unhandled Flutterwave webhook event: ${event}`)
        return null
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex')

    return hash === signature
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'bank_transfer',
      'ussd',
      'mobile_money',
      'qr',
      'mpesa',
      'ghana_mobile_money',
      'uganda_mobile_money',
      'rwanda_mobile_money',
      'zambia_mobile_money',
    ]
  }

  private getMobileMoneyBankCode(provider: string): string {
    const codes = {
      'mpesa': 'MPS',
      'airtel': 'ATL',
      'mtn': 'MTN',
      'vodafone': 'VDF',
      'tigo': 'TGO',
    }
    return codes[provider.toLowerCase()] || 'MPS'
  }
}