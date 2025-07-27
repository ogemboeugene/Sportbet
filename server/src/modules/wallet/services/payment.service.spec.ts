import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { PaymentService } from './payment.service'
import { FlutterwaveGateway } from '../gateways/flutterwave.gateway'
import { PaystackGateway } from '../gateways/paystack.gateway'
import { StripeGateway } from '../gateways/stripe.gateway'
import { MpesaGateway } from '../gateways/mpesa.gateway'
import { PaypalGateway } from '../gateways/paypal.gateway'

describe('PaymentService', () => {
  let service: PaymentService
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'FLUTTERWAVE_SECRET_KEY': 'test-flw-key',
        'PAYSTACK_SECRET_KEY': 'test-paystack-key',
        'STRIPE_SECRET_KEY': 'test-stripe-key',
        'MPESA_CONSUMER_KEY': 'test-mpesa-key',
        'PAYPAL_CLIENT_ID': 'test-paypal-id',
      }
      return config[key]
    }),
  }

  const mockFlutterwaveGateway = {
    name: 'flutterwave',
    supportedCurrencies: ['NGN', 'USD', 'EUR'],
    supportedCountries: ['NG', 'KE', 'UG'],
    getSupportedPaymentMethods: () => ['card', 'bank_transfer', 'mobile_money'],
  }

  const mockPaystackGateway = {
    name: 'paystack',
    supportedCurrencies: ['NGN', 'USD', 'GHS'],
    supportedCountries: ['NG', 'GH', 'ZA'],
    getSupportedPaymentMethods: () => ['card', 'bank', 'ussd'],
  }

  const mockStripeGateway = {
    name: 'stripe',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedCountries: ['US', 'CA', 'GB'],
    getSupportedPaymentMethods: () => ['card', 'bank_transfer'],
  }

  const mockMpesaGateway = {
    name: 'mpesa',
    supportedCurrencies: ['KES'],
    supportedCountries: ['KE'],
    getSupportedPaymentMethods: () => ['mpesa', 'mobile_money'],
  }

  const mockPaypalGateway = {
    name: 'paypal',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedCountries: ['US', 'CA', 'GB'],
    getSupportedPaymentMethods: () => ['paypal', 'card'],
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FlutterwaveGateway, useValue: mockFlutterwaveGateway },
        { provide: PaystackGateway, useValue: mockPaystackGateway },
        { provide: StripeGateway, useValue: mockStripeGateway },
        { provide: MpesaGateway, useValue: mockMpesaGateway },
        { provide: PaypalGateway, useValue: mockPaypalGateway },
      ],
    }).compile()

    service = module.get<PaymentService>(PaymentService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should initialize all payment gateways', () => {
    const stats = service.getGatewayStats()
    expect(stats.total).toBe(5)
    expect(stats.enabled).toBe(5)
    expect(stats.gateways).toHaveLength(5)
  })

  it('should get available gateways for USD currency', () => {
    const gateways = service.getAvailableGateways('USD')
    expect(gateways.length).toBeGreaterThan(0)
    expect(gateways.every(g => g.currencies.includes('USD'))).toBe(true)
  })

  it('should get available gateways for NGN currency in Nigeria', () => {
    const gateways = service.getAvailableGateways('NGN', 'NG')
    expect(gateways.length).toBeGreaterThan(0)
    expect(gateways.every(g => g.currencies.includes('NGN') && g.countries.includes('NG'))).toBe(true)
  })

  it('should get best gateway for USD', () => {
    const gateway = service.getBestGateway('USD')
    expect(gateway).toBeDefined()
    expect(gateway?.supportedCurrencies).toContain('USD')
  })

  it('should get specific gateway by name', () => {
    const gateway = service.getGateway('flutterwave')
    expect(gateway).toBeDefined()
    expect(gateway?.name).toBe('flutterwave')
  })

  it('should return null for unknown gateway', () => {
    const gateway = service.getGateway('unknown')
    expect(gateway).toBeNull()
  })

  it('should get supported payment methods for a gateway', () => {
    const methods = service.getSupportedPaymentMethods('flutterwave')
    expect(methods).toEqual(['card', 'bank_transfer', 'mobile_money'])
  })

  it('should get all supported payment methods', () => {
    const allMethods = service.getAllSupportedPaymentMethods()
    expect(Object.keys(allMethods)).toHaveLength(5)
    expect(allMethods.flutterwave).toEqual(['card', 'bank_transfer', 'mobile_money'])
    expect(allMethods.paystack).toEqual(['card', 'bank', 'ussd'])
  })

  it('should throw error for legacy processDeposit method', async () => {
    await expect(service.processDeposit('user1', 100, 'card')).rejects.toThrow('Use initiateDeposit method instead')
  })

  it('should throw error for legacy processWithdrawal method', async () => {
    await expect(service.processWithdrawal('user1', 100, 'bank')).rejects.toThrow('Use initiateWithdrawal method instead')
  })
})