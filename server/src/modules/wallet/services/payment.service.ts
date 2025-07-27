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

export interface PaymentGatewayConfig {
  name: string
  enabled: boolean
  priority: number
  currencies: string[]
  countries: string[]
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)
  private readonly gateways: Map<string, PaymentGateway> = new Map()
  private gatewayConfigs: PaymentGatewayConfig[] = []

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

    // Configure gateway priorities and availability
    this.gatewayConfigs = [
      {
        name: 'flutterwave',
        enabled: !!this.configService.get('FLUTTERWAVE_SECRET_KEY'),
        priority: 1,
        currencies: this.flutterwaveGateway.supportedCurrencies,
        countries: this.flutterwaveGateway.supportedCountries,
      },
      {
        name: 'paystack',
        enabled: !!this.configService.get('PAYSTACK_SECRET_KEY'),
        priority: 2,
        currencies: this.paystackGateway.supportedCurrencies,
        countries: this.paystackGateway.supportedCountries,
      },
      {
        name: 'stripe',
        enabled: !!this.configService.get('STRIPE_SECRET_KEY'),
        priority: 3,
        currencies: this.stripeGateway.supportedCurrencies,
        countries: this.stripeGateway.supportedCountries,
      },
      {
        name: 'mpesa',
        enabled: !!this.configService.get('MPESA_CONSUMER_KEY'),
        priority: 4,
        currencies: this.mpesaGateway.supportedCurrencies,
        countries: this.mpesaGateway.supportedCountries,
      },
      {
        name: 'paypal',
        enabled: !!this.configService.get('PAYPAL_CLIENT_ID'),
        priority: 5,
        currencies: this.paypalGateway.supportedCurrencies,
        countries: this.paypalGateway.supportedCountries,
      },
    ]

    this.logger.log(`Initialized ${this.gatewayConfigs.filter(g => g.enabled).length} payment gateways`)
  }

  /**
   * Get available payment gateways for a specific currency and country
   */
  getAvailableGateways(currency: string, country?: string): PaymentGatewayConfig[] {
    return this.gatewayConfigs
      .filter(config => {
        if (!config.enabled) return false
        if (!config.currencies.includes(currency)) return false
        if (country && !config.countries.includes(country)) return false
        return true
      })
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get the best payment gateway for a specific currency and country
   */
  getBestGateway(currency: string, country?: string): PaymentGateway | null {
    const availableGateways = this.getAvailableGateways(currency, country)
    if (availableGateways.length === 0) return null

    const bestGateway = availableGateways[0]
    return this.gateways.get(bestGateway.name) || null
  }

  /**
   * Get a specific payment gateway by name
   */
  getGateway(gatewayName: string): PaymentGateway | null {
    const gateway = this.gateways.get(gatewayName)
    if (!gateway) return null

    const config = this.gatewayConfigs.find(c => c.name === gatewayName)
    if (!config?.enabled) return null

    return gateway
  }

  /**
   * Initiate a deposit using the specified gateway or the best available one
   */
  async initiateDeposit(
    request: PaymentRequest,
    gatewayName?: string,
    country?: string
  ): Promise<PaymentResponse> {
    let gateway: PaymentGateway | null

    if (gatewayName) {
      gateway = this.getGateway(gatewayName)
      if (!gateway) {
        throw new BadRequestException(`Payment gateway '${gatewayName}' is not available`)
      }
    } else {
      gateway = this.getBestGateway(request.currency, country)
      if (!gateway) {
        throw new BadRequestException(
          `No payment gateway available for currency ${request.currency}${country ? ` in ${country}` : ''}`
        )
      }
    }

    this.logger.log(`Initiating deposit via ${gateway.name} for user ${request.userId}`)
    
    try {
      const response = await gateway.initiateDeposit(request)
      
      this.logger.log(
        `Deposit initiation ${response.success ? 'successful' : 'failed'} via ${gateway.name}`,
        { transactionId: response.transactionId, status: response.status }
      )
      
      return response
    } catch (error) {
      this.logger.error(`Deposit initiation failed via ${gateway.name}`, error)
      throw error
    }
  }

  /**
   * Verify a deposit transaction
   */
  async verifyDeposit(transactionId: string, gatewayName: string): Promise<PaymentResponse> {
    const gateway = this.getGateway(gatewayName)
    if (!gateway) {
      throw new BadRequestException(`Payment gateway '${gatewayName}' is not available`)
    }

    this.logger.log(`Verifying deposit ${transactionId} via ${gateway.name}`)
    
    try {
      const response = await gateway.verifyDeposit(transactionId)
      
      this.logger.log(
        `Deposit verification ${response.success ? 'successful' : 'failed'} via ${gateway.name}`,
        { transactionId, status: response.status }
      )
      
      return response
    } catch (error) {
      this.logger.error(`Deposit verification failed via ${gateway.name}`, error)
      throw error
    }
  }

  /**
   * Initiate a withdrawal using the specified gateway or the best available one
   */
  async initiateWithdrawal(
    request: WithdrawalRequest,
    gatewayName?: string,
    country?: string
  ): Promise<WithdrawalResponse> {
    let gateway: PaymentGateway | null

    if (gatewayName) {
      gateway = this.getGateway(gatewayName)
      if (!gateway) {
        throw new BadRequestException(`Payment gateway '${gatewayName}' is not available`)
      }
    } else {
      gateway = this.getBestGateway(request.currency, country)
      if (!gateway) {
        throw new BadRequestException(
          `No payment gateway available for currency ${request.currency}${country ? ` in ${country}` : ''}`
        )
      }
    }

    this.logger.log(`Initiating withdrawal via ${gateway.name} for user ${request.userId}`)
    
    try {
      const response = await gateway.initiateWithdrawal(request)
      
      this.logger.log(
        `Withdrawal initiation ${response.success ? 'successful' : 'failed'} via ${gateway.name}`,
        { transactionId: response.transactionId, status: response.status }
      )
      
      return response
    } catch (error) {
      this.logger.error(`Withdrawal initiation failed via ${gateway.name}`, error)
      throw error
    }
  }

  /**
   * Verify a withdrawal transaction
   */
  async verifyWithdrawal(transactionId: string, gatewayName: string): Promise<WithdrawalResponse> {
    const gateway = this.getGateway(gatewayName)
    if (!gateway) {
      throw new BadRequestException(`Payment gateway '${gatewayName}' is not available`)
    }

    this.logger.log(`Verifying withdrawal ${transactionId} via ${gateway.name}`)
    
    try {
      const response = await gateway.verifyWithdrawal(transactionId)
      
      this.logger.log(
        `Withdrawal verification ${response.success ? 'successful' : 'failed'} via ${gateway.name}`,
        { transactionId, status: response.status }
      )
      
      return response
    } catch (error) {
      this.logger.error(`Withdrawal verification failed via ${gateway.name}`, error)
      throw error
    }
  }

  /**
   * Handle webhook from a specific gateway
   */
  async handleWebhook(
    gatewayName: string,
    payload: WebhookPayload,
    signature?: string
  ): Promise<{
    transactionId: string
    status: string
    amount?: number
    metadata?: any
  } | null> {
    const gateway = this.getGateway(gatewayName)
    if (!gateway) {
      this.logger.warn(`Webhook received for unknown gateway: ${gatewayName}`)
      return null
    }

    // Validate webhook signature if provided
    if (signature) {
      const isValid = gateway.validateWebhookSignature(JSON.stringify(payload), signature)
      if (!isValid) {
        this.logger.warn(`Invalid webhook signature for ${gatewayName}`)
        return null
      }
    }

    this.logger.log(`Processing webhook from ${gatewayName}`, { event: payload.event })
    
    try {
      const result = await gateway.handleWebhook(payload)
      
      if (result) {
        this.logger.log(
          `Webhook processed successfully from ${gatewayName}`,
          { transactionId: result.transactionId, status: result.status }
        )
      } else {
        this.logger.log(`Webhook ignored from ${gatewayName}`, { event: payload.event })
      }
      
      return result
    } catch (error) {
      this.logger.error(`Webhook processing failed from ${gatewayName}`, error)
      throw error
    }
  }

  /**
   * Get supported payment methods for a gateway
   */
  getSupportedPaymentMethods(gatewayName: string): string[] {
    const gateway = this.getGateway(gatewayName)
    return gateway ? gateway.getSupportedPaymentMethods() : []
  }

  /**
   * Get all supported payment methods across all enabled gateways
   */
  getAllSupportedPaymentMethods(): Record<string, string[]> {
    const methods: Record<string, string[]> = {}
    
    this.gatewayConfigs
      .filter(config => config.enabled)
      .forEach(config => {
        const gateway = this.gateways.get(config.name)
        if (gateway) {
          methods[config.name] = gateway.getSupportedPaymentMethods()
        }
      })
    
    return methods
  }

  /**
   * Get gateway statistics
   */
  getGatewayStats(): {
    total: number
    enabled: number
    gateways: Array<{
      name: string
      enabled: boolean
      currencies: number
      countries: number
      methods: number
    }>
  } {
    const gateways = this.gatewayConfigs.map(config => {
      const gateway = this.gateways.get(config.name)
      return {
        name: config.name,
        enabled: config.enabled,
        currencies: config.currencies.length,
        countries: config.countries.length,
        methods: gateway ? gateway.getSupportedPaymentMethods().length : 0,
      }
    })

    return {
      total: gateways.length,
      enabled: gateways.filter(g => g.enabled).length,
      gateways,
    }
  }

  // Legacy methods for backward compatibility
  async processDeposit(userId: string, amount: number, paymentMethod: string): Promise<any> {
    throw new Error('Use initiateDeposit method instead')
  }

  async processWithdrawal(userId: string, amount: number, paymentMethod: string): Promise<any> {
    throw new Error('Use initiateWithdrawal method instead')
  }
}