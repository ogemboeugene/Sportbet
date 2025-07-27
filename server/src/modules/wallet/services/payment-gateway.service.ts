import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  WebhookPayload,
} from '../interfaces/payment-gateway.interface'
import { FlutterwaveGateway } from '../gateways/flutterwave.gateway'
import { PaystackGateway } from '../gateways/paystack.gateway'
import { StripeGateway } from '../gateways/stripe.gateway'
import { MpesaGateway } from '../gateways/mpesa.gateway'
import { PaypalGateway } from '../gateways/paypal.gateway'

export interface GatewaySelectionCriteria {
  currency: string
  country?: string
  amount: number
  paymentMethod?: string
  userPreference?: string
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name)
  private readonly gateways: Map<string, PaymentGateway> = new Map()

  constructor(
    private configService: ConfigService,
    private flutterwaveGateway: FlutterwaveGateway,
    private paystackGateway: PaystackGateway,
    private stripeGateway: StripeGateway,
    private mpesaGateway: MpesaGateway,
    private paypalGateway: PaypalGateway,
  ) {
    this.initializeGateways()
  }

  private initializeGateways() {
    // Register all available gateways
    this.gateways.set('flutterwave', this.flutterwaveGateway)
    this.gateways.set('paystack', this.paystackGateway)
    this.gateways.set('stripe', this.stripeGateway)
    this.gateways.set('mpesa', this.mpesaGateway)
    this.gateways.set('paypal', this.paypalGateway)

    this.logger.log(`Initialized ${this.gateways.size} payment gateways`)
  }

  /**
   * Select the best payment gateway based on criteria
   */
  selectGateway(criteria: GatewaySelectionCriteria): PaymentGateway {
    const { currency, country, amount, paymentMethod, userPreference } = criteria

    // If user has a preference and it's available, use it
    if (userPreference && this.gateways.has(userPreference)) {
      const gateway = this.gateways.get(userPreference)
      if (this.isGatewaySupported(gateway, criteria)) {
        return gateway
      }
    }

    // Find gateways that support the currency and country
    const supportedGateways = Array.from(this.gateways.values()).filter(gateway =>
      this.isGatewaySupported(gateway, criteria)
    )

    if (supportedGateways.length === 0) {
      throw new BadRequestException(`No payment gateway supports ${currency} in ${country}`)
    }

    // Apply selection logic based on various factors
    return this.applyGatewaySelectionLogic(supportedGateways, criteria)
  }

  /**
   * Get all available gateways for given criteria
   */
  getAvailableGateways(criteria: GatewaySelectionCriteria): PaymentGateway[] {
    return Array.from(this.gateways.values()).filter(gateway =>
      this.isGatewaySupported(gateway, criteria)
    )
  }

  /**
   * Get gateway by name
   */
  getGateway(name: string): PaymentGateway {
    const gateway = this.gateways.get(name)
    if (!gateway) {
      throw new BadRequestException(`Payment gateway '${name}' not found`)
    }
    return gateway
  }

  /**
   * Process deposit using the best available gateway
   */
  async processDeposit(request: PaymentRequest, gatewayName?: string): Promise<PaymentResponse> {
    try {
      const gateway = gatewayName
        ? this.getGateway(gatewayName)
        : this.selectGateway({
            currency: request.currency,
            amount: request.amount,
          })

      this.logger.log(`Processing deposit with ${gateway.name} gateway`)
      return await gateway.initiateDeposit(request)
    } catch (error) {
      this.logger.error('Deposit processing failed', error)
      throw error
    }
  }

  /**
   * Process withdrawal using the best available gateway
   */
  async processWithdrawal(request: WithdrawalRequest, gatewayName?: string): Promise<WithdrawalResponse> {
    try {
      const gateway = gatewayName
        ? this.getGateway(gatewayName)
        : this.selectGateway({
            currency: request.currency,
            amount: request.amount,
          })

      this.logger.log(`Processing withdrawal with ${gateway.name} gateway`)
      return await gateway.initiateWithdrawal(request)
    } catch (error) {
      this.logger.error('Withdrawal processing failed', error)
      throw error
    }
  }

  /**
   * Verify transaction status
   */
  async verifyTransaction(transactionId: string, gatewayName: string, type: 'deposit' | 'withdrawal'): Promise<PaymentResponse | WithdrawalResponse> {
    try {
      const gateway = this.getGateway(gatewayName)

      if (type === 'deposit') {
        return await gateway.verifyDeposit(transactionId)
      } else {
        return await gateway.verifyWithdrawal(transactionId)
      }
    } catch (error) {
      this.logger.error('Transaction verification failed', error)
      throw error
    }
  }

  /**
   * Handle webhook from any gateway
   */
  async handleWebhook(gatewayName: string, payload: WebhookPayload, signature?: string): Promise<{
    transactionId: string
    status: string
    amount?: number
    metadata?: any
  }> {
    try {
      const gateway = this.getGateway(gatewayName)

      // Validate webhook signature if provided
      if (signature && !gateway.validateWebhookSignature(JSON.stringify(payload), signature)) {
        throw new BadRequestException('Invalid webhook signature')
      }

      return await gateway.handleWebhook(payload)
    } catch (error) {
      this.logger.error(`Webhook handling failed for ${gatewayName}`, error)
      throw error
    }
  }

  /**
   * Get supported payment methods for a gateway
   */
  getSupportedPaymentMethods(gatewayName: string): string[] {
    const gateway = this.getGateway(gatewayName)
    return gateway.getSupportedPaymentMethods()
  }

  /**
   * Get all supported currencies across all gateways
   */
  getAllSupportedCurrencies(): string[] {
    const currencies = new Set<string>()
    this.gateways.forEach(gateway => {
      gateway.supportedCurrencies.forEach(currency => currencies.add(currency))
    })
    return Array.from(currencies)
  }

  /**
   * Get all supported countries across all gateways
   */
  getAllSupportedCountries(): string[] {
    const countries = new Set<string>()
    this.gateways.forEach(gateway => {
      gateway.supportedCountries.forEach(country => countries.add(country))
    })
    return Array.from(countries)
  }

  private isGatewaySupported(gateway: PaymentGateway, criteria: GatewaySelectionCriteria): boolean {
    const { currency, country, paymentMethod } = criteria

    // Check currency support
    if (!gateway.supportedCurrencies.includes(currency)) {
      return false
    }

    // Check country support if provided
    if (country && !gateway.supportedCountries.includes(country)) {
      return false
    }

    // Check payment method support if provided
    if (paymentMethod && !gateway.getSupportedPaymentMethods().includes(paymentMethod)) {
      return false
    }

    return true
  }

  private applyGatewaySelectionLogic(gateways: PaymentGateway[], criteria: GatewaySelectionCriteria): PaymentGateway {
    const { currency, country, amount, paymentMethod } = criteria

    // Priority rules for gateway selection
    
    // 1. For M-Pesa payments in Kenya, always use M-Pesa gateway
    if (paymentMethod === 'mpesa' || currency === 'KES') {
      const mpesa = gateways.find(g => g.name === 'mpesa')
      if (mpesa) return mpesa
    }

    // 2. For Nigerian Naira, prefer Paystack over Flutterwave for smaller amounts
    if (currency === 'NGN') {
      if (amount < 50000) { // Less than 500 NGN
        const paystack = gateways.find(g => g.name === 'paystack')
        if (paystack) return paystack
      }
      const flutterwave = gateways.find(g => g.name === 'flutterwave')
      if (flutterwave) return flutterwave
    }

    // 3. For international currencies, prefer Stripe for card payments
    if (['USD', 'EUR', 'GBP'].includes(currency) && paymentMethod === 'card') {
      const stripe = gateways.find(g => g.name === 'stripe')
      if (stripe) return stripe
    }

    // 4. For PayPal payments, use PayPal gateway
    if (paymentMethod === 'paypal') {
      const paypal = gateways.find(g => g.name === 'paypal')
      if (paypal) return paypal
    }

    // 5. For African countries, prefer Flutterwave for its wide coverage
    const africanCountries = ['NG', 'KE', 'UG', 'TZ', 'ZA', 'GH', 'RW']
    if (country && africanCountries.includes(country)) {
      const flutterwave = gateways.find(g => g.name === 'flutterwave')
      if (flutterwave) return flutterwave
    }

    // 6. Default to the first available gateway
    return gateways[0]
  }
}