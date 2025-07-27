import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import {
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  WebhookPayload,
} from '../interfaces/payment-gateway.interface'

@Injectable()
export class StripeGateway implements PaymentGateway {
  name = 'stripe'
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']
  supportedCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'LU', 'GR', 'CY', 'MT', 'SI', 'SK', 'EE', 'LV', 'LT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'JP', 'SG', 'HK', 'MY', 'TH', 'PH', 'ID', 'IN', 'BR', 'MX']

  private readonly logger = new Logger(StripeGateway.name)
  private readonly stripe: Stripe
  private readonly webhookSecret: string

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || ''
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || ''

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    })
  }

  async initiateDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: 'Wallet Deposit',
                description: request.description || 'Deposit funds to your wallet',
              },
              unit_amount: Math.round(request.amount * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.redirectUrl || `${this.configService.get('CLIENT_URL')}/wallet?status=success`,
        cancel_url: `${this.configService.get('CLIENT_URL')}/wallet?status=cancelled`,
        client_reference_id: `dep_${Date.now()}_${request.userId}`,
        customer_email: request.email,
        metadata: {
          userId: request.userId,
          type: 'deposit',
          ...request.metadata,
        },
      })

      return {
        success: true,
        transactionId: session.client_reference_id!,
        externalTransactionId: session.id,
        paymentUrl: session.url!,
        status: 'pending',
        message: 'Payment session created successfully',
        metadata: session,
      }
    } catch (error: any) {
      this.logger.error('Stripe deposit initiation failed', error)
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
      // Search for checkout sessions by client_reference_id
      const sessions = await this.stripe.checkout.sessions.list({
        limit: 100,
      })

      const session = sessions.data.find(s => s.client_reference_id === transactionId)

      if (!session) {
        throw new Error('Transaction not found')
      }

      let status: PaymentResponse['status'] = 'pending'
      if (session.payment_status === 'paid') {
        status = 'completed'
      } else if (session.payment_status === 'unpaid') {
        status = 'failed'
      }

      return {
        success: session.payment_status === 'paid',
        transactionId,
        externalTransactionId: session.id,
        status,
        message: `Payment ${session.payment_status}`,
        metadata: session,
      }
    } catch (error: any) {
      this.logger.error('Stripe deposit verification failed', error)
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
      // For Stripe, we need to create a transfer to a connected account or use Express payouts
      // This is a simplified implementation - in production, you'd need proper account setup
      
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(request.amount * 100), // Stripe uses cents
        currency: request.currency.toLowerCase(),
        destination: 'acct_connected_account_id', // This would be the user's connected account
        transfer_group: `wit_${Date.now()}_${request.userId}`,
        metadata: {
          userId: request.userId,
          type: 'withdrawal',
          ...request.metadata,
        },
      })

      return {
        success: true,
        transactionId: transfer.transfer_group!,
        externalTransactionId: transfer.id,
        status: 'processing',
        message: 'Withdrawal initiated successfully',
        metadata: transfer,
      }
    } catch (error: any) {
      this.logger.error('Stripe withdrawal initiation failed', error)
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
      // Search for transfers by transfer_group
      const transfers = await this.stripe.transfers.list({
        transfer_group: transactionId,
        limit: 1,
      })

      if (transfers.data.length === 0) {
        throw new Error('Transfer not found')
      }

      const transfer = transfers.data[0]

      let status: WithdrawalResponse['status'] = 'processing'
      if (transfer.reversed) {
        status = 'cancelled'
      } else {
        // For Stripe, we'd need to check the actual payout status
        status = 'completed'
      }

      return {
        success: !transfer.reversed,
        transactionId,
        externalTransactionId: transfer.id,
        status,
        message: transfer.reversed ? 'Transfer reversed' : 'Transfer completed',
        metadata: transfer,
      }
    } catch (error: any) {
      this.logger.error('Stripe withdrawal verification failed', error)
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
      case 'checkout.session.completed':
        return {
          transactionId: data.client_reference_id,
          status: data.payment_status === 'paid' ? 'completed' : 'failed',
          amount: data.amount_total / 100, // Convert from cents
          metadata: data,
        }

      case 'payment_intent.succeeded':
        return {
          transactionId: data.metadata?.transactionId || data.id,
          status: 'completed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'payment_intent.payment_failed':
        return {
          transactionId: data.metadata?.transactionId || data.id,
          status: 'failed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.created':
        return {
          transactionId: data.transfer_group,
          status: 'processing',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.paid':
        return {
          transactionId: data.transfer_group,
          status: 'completed',
          amount: data.amount / 100,
          metadata: data,
        }

      case 'transfer.failed':
        return {
          transactionId: data.transfer_group,
          status: 'failed',
          amount: data.amount / 100,
          metadata: data,
        }

      default:
        this.logger.warn(`Unhandled Stripe webhook event: ${event}`)
        return null
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)
      return true
    } catch (error) {
      this.logger.error('Stripe webhook signature validation failed', error)
      return false
    }
  }

  getSupportedPaymentMethods(): string[] {
    return [
      'card',
      'bank_transfer',
      'sepa_debit',
      'ideal',
      'sofort',
      'giropay',
      'bancontact',
      'eps',
      'p24',
      'alipay',
      'wechat_pay',
    ]
  }
}