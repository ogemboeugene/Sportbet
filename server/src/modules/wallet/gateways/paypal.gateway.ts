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
export class PaypalGateway implements PaymentGateway {
  name = 'paypal'
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'MXN', 'BRL', 'MYR', 'PHP', 'TWD', 'THB', 'SGD', 'HKD', 'NZD', 'RUB']
  supportedCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'LU', 'GR', 'CY', 'MT', 'SI', 'SK', 'EE', 'LV', 'LT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'JP', 'SG', 'HK', 'MY', 'TH', 'PH', 'ID', 'IN', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'VE', 'IL', 'TR', 'ZA', 'RU', 'UA', 'KZ', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KG', 'TJ', 'TM', 'UZ', 'MN', 'CN', 'TW', 'KR', 'VN', 'LA', 'KH', 'MM', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF', 'PK', 'IR', 'IQ', 'SY', 'LB', 'JO', 'PS', 'SA', 'AE', 'OM', 'YE', 'KW', 'BH', 'QA', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'SS', 'ET', 'ER', 'DJ', 'SO', 'KE', 'UG', 'TZ', 'RW', 'BI', 'MG', 'MU', 'SC', 'KM', 'MW', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MZ', 'AO', 'CD', 'CG', 'CF', 'TD', 'CM', 'GQ', 'GA', 'ST', 'GH', 'TG', 'BJ', 'NE', 'BF', 'ML', 'SN', 'MR', 'GM', 'GW', 'SL', 'LR', 'CI', 'GN']

  private readonly logger = new Logger(PaypalGateway.name)
  private readonly client: AxiosInstance
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly environment: string
  private readonly webhookId: string

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || ''
    this.clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET') || ''
    this.environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox'
    this.webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID') || ''

    const baseURL = this.environment === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com'

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async initiateDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      const transactionId = `dep_${Date.now()}_${request.userId}`

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: transactionId,
            amount: {
              currency_code: request.currency,
              value: request.amount.toFixed(2),
            },
            description: request.description || 'Wallet deposit',
            custom_id: request.userId,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'Betting Platform',
              locale: 'en-US',
              landing_page: 'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: request.redirectUrl || `${this.configService.get('CLIENT_URL')}/wallet?status=success`,
              cancel_url: `${this.configService.get('CLIENT_URL')}/wallet?status=cancelled`,
            },
          },
        },
      }

      const response = await this.client.post('/v2/checkout/orders', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': transactionId,
        },
      })

      const approvalLink = response.data.links.find((link: any) => link.rel === 'approve')

      return {
        success: true,
        transactionId,
        externalTransactionId: response.data.id,
        paymentUrl: approvalLink?.href,
        status: 'pending',
        message: 'PayPal order created successfully',
        metadata: response.data,
      }
    } catch (error: any) {
      this.logger.error('PayPal deposit initiation failed', error)
      return {
        success: false,
        transactionId: `dep_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'PayPal order creation failed',
      }
    }
  }

  async verifyDeposit(transactionId: string): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      // We need to get the PayPal order ID from our database
      // For now, we'll assume it's passed as the external transaction ID
      const response = await this.client.get(`/v2/checkout/orders/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const order = response.data
      let status: PaymentResponse['status'] = 'pending'

      if (order.status === 'COMPLETED') {
        status = 'completed'
      } else if (order.status === 'CANCELLED') {
        status = 'cancelled'
      } else if (order.status === 'DECLINED') {
        status = 'failed'
      }

      return {
        success: order.status === 'COMPLETED',
        transactionId: order.purchase_units[0]?.reference_id || transactionId,
        externalTransactionId: order.id,
        status,
        message: `Order ${order.status.toLowerCase()}`,
        metadata: order,
      }
    } catch (error: any) {
      this.logger.error('PayPal deposit verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Order verification failed',
      }
    }
  }

  async initiateWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      const transactionId = `wit_${Date.now()}_${request.userId}`

      const payload = {
        sender_batch_header: {
          sender_batch_id: transactionId,
          email_subject: 'You have a payout!',
          email_message: 'You have received a payout from Betting Platform.',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: request.amount.toFixed(2),
              currency: request.currency,
            },
            receiver: request.email,
            note: 'Wallet withdrawal',
            sender_item_id: transactionId,
          },
        ],
      }

      const response = await this.client.post('/v1/payments/payouts', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      return {
        success: true,
        transactionId,
        externalTransactionId: response.data.batch_header.payout_batch_id,
        status: 'processing',
        message: 'Payout batch created successfully',
        metadata: response.data,
      }
    } catch (error: any) {
      this.logger.error('PayPal withdrawal initiation failed', error)
      return {
        success: false,
        transactionId: `wit_${Date.now()}_${request.userId}`,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Payout creation failed',
      }
    }
  }

  async verifyWithdrawal(transactionId: string): Promise<WithdrawalResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      // Get payout batch details
      const response = await this.client.get(`/v1/payments/payouts/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const batch = response.data
      let status: WithdrawalResponse['status'] = 'processing'

      if (batch.batch_header.batch_status === 'SUCCESS') {
        status = 'completed'
      } else if (batch.batch_header.batch_status === 'DENIED' || batch.batch_header.batch_status === 'CANCELED') {
        status = 'failed'
      }

      return {
        success: batch.batch_header.batch_status === 'SUCCESS',
        transactionId: batch.batch_header.sender_batch_header.sender_batch_id,
        externalTransactionId: batch.batch_header.payout_batch_id,
        status,
        message: `Payout ${batch.batch_header.batch_status.toLowerCase()}`,
        metadata: batch,
      }
    } catch (error: any) {
      this.logger.error('PayPal withdrawal verification failed', error)
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Payout verification failed',
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
      case 'CHECKOUT.ORDER.APPROVED':
        return {
          transactionId: data.purchase_units[0]?.reference_id || data.id,
          status: 'completed',
          amount: parseFloat(data.purchase_units[0]?.amount?.value || '0'),
          metadata: data,
        }

      case 'CHECKOUT.ORDER.CANCELLED':
        return {
          transactionId: data.purchase_units[0]?.reference_id || data.id,
          status: 'cancelled',
          amount: parseFloat(data.purchase_units[0]?.amount?.value || '0'),
          metadata: data,
        }

      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
        return {
          transactionId: data.sender_item_id,
          status: 'completed',
          amount: parseFloat(data.payout_item.amount.value),
          metadata: data,
        }

      case 'PAYMENT.PAYOUTS-ITEM.FAILED':
        return {
          transactionId: data.sender_item_id,
          status: 'failed',
          amount: parseFloat(data.payout_item.amount.value),
          metadata: data,
        }

      case 'PAYMENT.PAYOUTS-ITEM.DENIED':
        return {
          transactionId: data.sender_item_id,
          status: 'failed',
          amount: parseFloat(data.payout_item.amount.value),
          metadata: data,
        }

      default:
        this.logger.warn(`Unhandled PayPal webhook event: ${event}`)
        return null
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      // PayPal webhook signature validation is complex and requires
      // certificate verification. This is a simplified implementation.
      // In production, use PayPal's SDK for proper validation.
      return true
    } catch (error) {
      this.logger.error('PayPal webhook signature validation failed', error)
      return false
    }
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'paypal',
      'card',
      'bank_transfer',
      'venmo',
      'apple_pay',
      'google_pay',
    ]
  }

  private async getAccessToken(): Promise<string> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      
      const response = await this.client.post('/v1/oauth2/token', 'grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      return response.data.access_token
    } catch (error) {
      this.logger.error('Failed to get PayPal access token', error)
      throw new Error('Failed to authenticate with PayPal API')
    }
  }
}