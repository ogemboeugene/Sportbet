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
export class MpesaGateway implements PaymentGateway {
  name = 'mpesa'
  supportedCurrencies = ['KES']
  supportedCountries = ['KE']

  private readonly logger = new Logger(MpesaGateway.name)
  private readonly client: AxiosInstance
  private readonly consumerKey: string
  private readonly consumerSecret: string
  private readonly businessShortCode: string
  private readonly passkey: string
  private readonly environment: string

  constructor(private configService: ConfigService) {
    this.consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY') || ''
    this.consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET') || ''
    this.businessShortCode = this.configService.get<string>('MPESA_BUSINESS_SHORT_CODE') || ''
    this.passkey = this.configService.get<string>('MPESA_PASSKEY') || ''
    this.environment = this.configService.get<string>('MPESA_ENVIRONMENT') || 'sandbox'

    const baseURL = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async initiateDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // First, get access token
      const accessToken = await this.getAccessToken()
      
      // Generate timestamp and password
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
      const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64')

      const transactionId = `dep_${Date.now()}_${request.userId}`

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: request.phone?.replace(/^\+/, ''), // Remove + prefix
        PartyB: this.businessShortCode,
        PhoneNumber: request.phone?.replace(/^\+/, ''),
        CallBackURL: `${this.configService.get('API_URL')}/wallet/webhooks/mpesa`,
        AccountReference: transactionId,
        TransactionDesc: request.description || 'Wallet deposit',
      }

      const response = await this.client.post('/mpesa/stkpush/v1/processrequest', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          transactionId,
          externalTransactionId: response.data.CheckoutRequestID,
          status: 'pending',
          message: 'STK push sent successfully',
          metadata: response.data,
        }
      } else {
        throw new Error(response.data.ResponseDescription || 'STK push failed')
      }
    } catch (error: any) {
      this.logger.error('M-Pesa deposit initiation failed', error)
      return {
        success: false,
        transactionId: `dep_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.ResponseDescription || error.message || 'STK push failed',
      }
    }
  }

  async verifyDeposit(transactionId: string): Promise<PaymentResponse> {
    try {
      // For M-Pesa, we typically rely on callbacks rather than polling
      // This is a placeholder implementation
      const accessToken = await this.getAccessToken()
      
      // In a real implementation, you'd query the transaction status
      // For now, we'll return a pending status
      return {
        success: false,
        transactionId,
        status: 'pending',
        message: 'M-Pesa verification requires callback handling',
      }
    } catch (error: any) {
      this.logger.error('M-Pesa deposit verification failed', error)
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
      const accessToken = await this.getAccessToken()
      
      const transactionId = `wit_${Date.now()}_${request.userId}`

      const payload = {
        InitiatorName: this.configService.get('MPESA_INITIATOR_NAME'),
        SecurityCredential: this.configService.get('MPESA_SECURITY_CREDENTIAL'),
        CommandID: 'BusinessPayment',
        Amount: Math.round(request.amount),
        PartyA: this.businessShortCode,
        PartyB: request.mobileWallet?.phoneNumber?.replace(/^\+/, ''),
        Remarks: 'Wallet withdrawal',
        QueueTimeOutURL: `${this.configService.get('API_URL')}/wallet/webhooks/mpesa/timeout`,
        ResultURL: `${this.configService.get('API_URL')}/wallet/webhooks/mpesa/result`,
        Occasion: transactionId,
      }

      const response = await this.client.post('/mpesa/b2c/v1/paymentrequest', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          transactionId,
          externalTransactionId: response.data.ConversationID,
          status: 'processing',
          message: 'B2C payment initiated successfully',
          metadata: response.data,
        }
      } else {
        throw new Error(response.data.ResponseDescription || 'B2C payment failed')
      }
    } catch (error: any) {
      this.logger.error('M-Pesa withdrawal initiation failed', error)
      return {
        success: false,
        transactionId: `wit_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.ResponseDescription || error.message || 'B2C payment failed',
      }
    }
  }

  async verifyWithdrawal(transactionId: string): Promise<WithdrawalResponse> {
    try {
      // Similar to deposits, M-Pesa withdrawals rely on callbacks
      return {
        success: false,
        transactionId,
        status: 'processing',
        message: 'M-Pesa withdrawal verification requires callback handling',
      }
    } catch (error: any) {
      this.logger.error('M-Pesa withdrawal verification failed', error)
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
    const { data } = payload

    // Handle STK Push callback
    if (data.Body?.stkCallback) {
      const callback = data.Body.stkCallback
      const transactionId = callback.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'AccountReference'
      )?.Value

      if (callback.ResultCode === 0) {
        const amount = callback.CallbackMetadata?.Item?.find(
          (item: any) => item.Name === 'Amount'
        )?.Value

        return {
          transactionId,
          status: 'completed',
          amount: amount,
          metadata: callback,
        }
      } else {
        return {
          transactionId,
          status: 'failed',
          metadata: callback,
        }
      }
    }

    // Handle B2C result callback
    if (data.Result) {
      const result = data.Result
      const transactionId = result.OriginatorConversationID

      if (result.ResultCode === 0) {
        const amount = result.ResultParameters?.ResultParameter?.find(
          (param: any) => param.Key === 'TransactionAmount'
        )?.Value

        return {
          transactionId,
          status: 'completed',
          amount: amount,
          metadata: result,
        }
      } else {
        return {
          transactionId,
          status: 'failed',
          metadata: result,
        }
      }
    }

    this.logger.warn('Unhandled M-Pesa webhook payload', data)
    return null
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    // M-Pesa doesn't use signature validation in the same way
    // Instead, we validate the source IP and other security measures
    return true
  }

  getSupportedPaymentMethods(): string[] {
    return ['mpesa', 'mobile_money']
  }

  private async getAccessToken(): Promise<string> {
    try {
      const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')
      
      const response = await this.client.get('/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      })

      return response.data.access_token
    } catch (error) {
      this.logger.error('Failed to get M-Pesa access token', error)
      throw new Error('Failed to authenticate with M-Pesa API')
    }
  }
}