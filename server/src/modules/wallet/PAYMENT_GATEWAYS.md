# Payment Gateway Integration

This document outlines the payment gateway integrations implemented for the betting platform.

## Implemented Gateways

### 1. Flutterwave Gateway
- **File**: `gateways/flutterwave.gateway.ts`
- **Supported Currencies**: NGN, USD, EUR, GBP, KES, UGX, TZS, ZAR
- **Supported Countries**: NG, KE, UG, TZ, ZA, GH, RW
- **Payment Methods**: Card, Bank Transfer, USSD, Mobile Money, QR, M-Pesa
- **Features**: Deposits, Withdrawals, Webhook handling

### 2. Paystack Gateway
- **File**: `gateways/paystack.gateway.ts`
- **Supported Currencies**: NGN, USD, GHS, ZAR
- **Supported Countries**: NG, GH, ZA
- **Payment Methods**: Card, Bank, USSD, QR, Mobile Money, Bank Transfer
- **Features**: Deposits, Withdrawals, Webhook handling

### 3. Stripe Gateway
- **File**: `gateways/stripe.gateway.ts`
- **Supported Currencies**: USD, EUR, GBP, CAD, AUD, JPY, CHF, SEK, NOK, DKK
- **Supported Countries**: US, CA, GB, AU, DE, FR, IT, ES, NL, BE, AT, CH, SE, NO, DK, FI, IE, PT, LU, GR, CY, MT, SI, SK, EE, LV, LT, PL, CZ, HU, RO, BG, HR, JP, SG, HK, MY, TH, PH, ID, IN, BR, MX
- **Payment Methods**: Card, Bank Transfer, SEPA Debit, iDEAL, Sofort, Giropay, Bancontact, EPS, P24, Alipay, WeChat Pay
- **Features**: Deposits, Withdrawals, Webhook handling

### 4. M-Pesa Daraja API Gateway
- **File**: `gateways/mpesa.gateway.ts`
- **Supported Currencies**: KES
- **Supported Countries**: KE
- **Payment Methods**: M-Pesa, Mobile Money
- **Features**: STK Push for deposits, B2C payments for withdrawals, Webhook handling

### 5. PayPal Gateway
- **File**: `gateways/paypal.gateway.ts`
- **Supported Currencies**: USD, EUR, GBP, CAD, AUD, JPY, CHF, SEK, NOK, DKK, PLN, CZK, HUF, ILS, MXN, BRL, MYR, PHP, TWD, THB, SGD, HKD, NZD, RUB
- **Supported Countries**: Global coverage (200+ countries)
- **Payment Methods**: PayPal, Card, Bank Transfer, Venmo, Apple Pay, Google Pay
- **Features**: Deposits, Payouts for withdrawals, Webhook handling

## Unified Payment Service

### PaymentService Class
- **File**: `services/payment.service.ts`
- **Features**:
  - Gateway selection logic based on currency and country
  - Unified interface for all payment operations
  - Gateway priority management
  - Automatic fallback to best available gateway
  - Comprehensive error handling and logging

### Key Methods
- `initiateDeposit()` - Start a deposit transaction
- `verifyDeposit()` - Verify deposit status
- `initiateWithdrawal()` - Start a withdrawal transaction
- `verifyWithdrawal()` - Verify withdrawal status
- `handleWebhook()` - Process webhook notifications
- `getAvailableGateways()` - Get gateways for specific currency/country
- `getBestGateway()` - Get optimal gateway for transaction

## Webhook Endpoints

All payment gateways have dedicated webhook endpoints for real-time transaction updates:

- `/wallet/webhooks/flutterwave` - Flutterwave webhook handler
- `/wallet/webhooks/paystack` - Paystack webhook handler
- `/wallet/webhooks/stripe` - Stripe webhook handler
- `/wallet/webhooks/mpesa` - M-Pesa webhook handler
- `/wallet/webhooks/paypal` - PayPal webhook handler

## Environment Variables

Required environment variables for each gateway:

```bash
# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret

# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# M-Pesa
MPESA_CONSUMER_KEY=xxxxx
MPESA_CONSUMER_SECRET=xxxxx
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=sandbox
MPESA_INITIATOR_NAME=testapi
MPESA_SECURITY_CREDENTIAL=your-security-credential

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=your-webhook-id
```

## Usage Examples

### Initiating a Deposit
```typescript
const paymentRequest = {
  amount: 100,
  currency: 'USD',
  userId: 'user123',
  email: 'user@example.com',
  phone: '+1234567890',
  description: 'Wallet deposit',
}

const response = await paymentService.initiateDeposit(paymentRequest, 'stripe')
```

### Processing Webhooks
```typescript
const result = await paymentService.handleWebhook('stripe', webhookPayload, signature)
if (result) {
  // Update transaction status and wallet balance
  await processWebhookResult(result)
}
```

## Testing

Comprehensive test suites are included:
- `payment.service.spec.ts` - Tests for unified payment service
- `flutterwave.gateway.spec.ts` - Tests for Flutterwave integration
- Additional gateway tests can be added following the same pattern

## Security Features

- Webhook signature validation for all gateways
- Secure API key management through environment variables
- Request/response logging for audit trails
- Error handling with sensitive data protection
- Rate limiting and timeout handling

## Next Steps

1. Add more comprehensive integration tests
2. Implement retry mechanisms for failed transactions
3. Add transaction monitoring and alerting
4. Implement currency conversion for multi-currency support
5. Add fraud detection and risk scoring