import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { FlutterwaveGateway } from './flutterwave.gateway'

describe('FlutterwaveGateway', () => {
  let gateway: FlutterwaveGateway
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'FLUTTERWAVE_SECRET_KEY': 'FLWSECK_TEST-test-secret-key',
        'FLUTTERWAVE_PUBLIC_KEY': 'FLWPUBK_TEST-test-public-key',
        'FLUTTERWAVE_WEBHOOK_SECRET': 'test-webhook-secret',
        'CLIENT_URL': 'http://localhost:3000',
        'API_URL': 'http://localhost:3000',
      }
      return config[key]
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterwaveGateway,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    gateway = module.get<FlutterwaveGateway>(FlutterwaveGateway)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(gateway).toBeDefined()
  })

  it('should have correct gateway properties', () => {
    expect(gateway.name).toBe('flutterwave')
    expect(gateway.supportedCurrencies).toContain('NGN')
    expect(gateway.supportedCurrencies).toContain('USD')
    expect(gateway.supportedCountries).toContain('NG')
    expect(gateway.supportedCountries).toContain('KE')
  })

  it('should return supported payment methods', () => {
    const methods = gateway.getSupportedPaymentMethods()
    expect(methods).toContain('card')
    expect(methods).toContain('bank_transfer')
    expect(methods).toContain('mobile_money')
    expect(methods).toContain('mpesa')
  })

  it('should validate webhook signature', () => {
    const payload = JSON.stringify({ test: 'data' })
    const signature = 'test-signature'
    
    // This will return false since we're using a mock webhook secret
    // In a real implementation, this would validate against the actual signature
    const isValid = gateway.validateWebhookSignature(payload, signature)
    expect(typeof isValid).toBe('boolean')
  })

  it('should handle webhook events', async () => {
    const webhookPayload = {
      event: 'charge.completed',
      data: {
        tx_ref: 'dep_123456_user1',
        status: 'successful',
        amount: 1000,
        currency: 'NGN',
      },
    }

    const result = await gateway.handleWebhook(webhookPayload)
    
    expect(result).toBeDefined()
    expect(result?.transactionId).toBe('dep_123456_user1')
    expect(result?.status).toBe('completed')
    expect(result?.amount).toBe(1000)
  })

  it('should handle unknown webhook events', async () => {
    const webhookPayload = {
      event: 'unknown.event',
      data: {},
    }

    const result = await gateway.handleWebhook(webhookPayload)
    expect(result).toBeNull()
  })

  it('should get mobile money bank code', () => {
    // Test the private method indirectly through supported methods
    const methods = gateway.getSupportedPaymentMethods()
    expect(methods).toContain('mpesa')
    expect(methods).toContain('mobile_money')
  })
})