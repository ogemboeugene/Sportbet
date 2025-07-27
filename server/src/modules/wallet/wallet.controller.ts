import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WalletService } from './wallet.service'
import { TransactionService, TransactionFilters, PaginationOptions } from './services/transaction.service'
import { PaymentService } from './services/payment.service'

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get()
  async getWallet(@Request() req) {
    const wallet = await this.walletService.getWallet(req.user.userId)
    return {
      balance: wallet.balance,
      bonusBalance: wallet.bonusBalance,
      lockedBalance: wallet.lockedBalance,
      availableBalance: wallet.balance + wallet.bonusBalance - wallet.lockedBalance,
      currency: wallet.currency,
      limits: {
        daily: wallet.dailyLimits,
        monthly: wallet.monthlyLimits,
      },
      totals: {
        daily: wallet.dailyTotals,
        monthly: wallet.monthlyTotals,
      },
      isFrozen: wallet.isFrozen,
      frozenReason: wallet.frozenReason,
      lastActivity: wallet.lastActivity,
    }
  }

  @Get('balance')
  async getBalance(@Request() req) {
    return await this.walletService.getBalance(req.user.userId)
  }

  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const filters: TransactionFilters = {}
    const pagination: PaginationOptions = {}

    // Parse pagination
    if (page) pagination.page = parseInt(page, 10)
    if (limit) pagination.limit = parseInt(limit, 10)
    if (sortBy) pagination.sortBy = sortBy
    if (sortOrder) pagination.sortOrder = sortOrder

    // Parse filters
    if (type) {
      filters.type = type.includes(',') ? type.split(',') : type
    }
    if (status) {
      filters.status = status.includes(',') ? status.split(',') : status
    }
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom)
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo)
    }

    return await this.transactionService.getUserTransactions(
      req.user.userId,
      filters,
      pagination,
    )
  }

  @Get('transactions/:id')
  async getTransaction(@Request() req, @Param('id') transactionId: string) {
    const transaction = await this.transactionService.getTransaction(transactionId)
    
    // Ensure user can only access their own transactions
    if (transaction.userId.toString() !== req.user.userId) {
      throw new BadRequestException('Transaction not found')
    }

    return transaction
  }

  @Get('stats')
  async getTransactionStats(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined
    const dateToObj = dateTo ? new Date(dateTo) : undefined

    return await this.transactionService.getTransactionStats(
      req.user.userId,
      dateFromObj,
      dateToObj,
    )
  }

  @Post('add-funds')
  async addFunds(
    @Request() req,
    @Body() body: {
      amount: number
      type: 'deposit' | 'win' | 'refund' | 'bonus' | 'adjustment'
      isBonus?: boolean
      metadata?: any
    },
  ) {
    const { amount, type, isBonus = false, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const result = await this.walletService.addFunds(
      req.user.userId,
      amount,
      type,
      metadata,
      isBonus,
    )

    return {
      success: true,
      wallet: {
        balance: result.wallet.balance,
        bonusBalance: result.wallet.bonusBalance,
        availableBalance: result.wallet.balance + result.wallet.bonusBalance - result.wallet.lockedBalance,
      },
      transaction: result.transaction,
    }
  }

  @Post('deduct-funds')
  async deductFunds(
    @Request() req,
    @Body() body: {
      amount: number
      type: 'withdrawal' | 'bet' | 'fee' | 'adjustment'
      useBonus?: boolean
      metadata?: any
    },
  ) {
    const { amount, type, useBonus = true, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const result = await this.walletService.deductFunds(
      req.user.userId,
      amount,
      type,
      metadata,
      useBonus,
    )

    return {
      success: true,
      wallet: {
        balance: result.wallet.balance,
        bonusBalance: result.wallet.bonusBalance,
        availableBalance: result.wallet.balance + result.wallet.bonusBalance - result.wallet.lockedBalance,
      },
      transaction: result.transaction,
      breakdown: result.breakdown,
    }
  }

  @Post('lock-funds')
  async lockFunds(
    @Request() req,
    @Body() body: { amount: number; metadata?: any },
  ) {
    const { amount, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.walletService.lockFunds(req.user.userId, amount, metadata)

    return {
      success: true,
      wallet: {
        balance: wallet.balance,
        bonusBalance: wallet.bonusBalance,
        lockedBalance: wallet.lockedBalance,
        availableBalance: wallet.balance + wallet.bonusBalance - wallet.lockedBalance,
      },
    }
  }

  @Post('unlock-funds')
  async unlockFunds(
    @Request() req,
    @Body() body: { amount: number; metadata?: any },
  ) {
    const { amount, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    const wallet = await this.walletService.unlockFunds(req.user.userId, amount, metadata)

    return {
      success: true,
      wallet: {
        balance: wallet.balance,
        bonusBalance: wallet.bonusBalance,
        lockedBalance: wallet.lockedBalance,
        availableBalance: wallet.balance + wallet.bonusBalance - wallet.lockedBalance,
      },
    }
  }

  @Put('limits')
  async updateLimits(
    @Request() req,
    @Body() body: {
      dailyDeposit?: number
      dailyWithdrawal?: number
      dailySpent?: number
      monthlyDeposit?: number
      monthlyWithdrawal?: number
      monthlySpent?: number
    },
  ) {
    const wallet = await this.walletService.updateLimits(req.user.userId, body)

    return {
      success: true,
      limits: {
        daily: wallet.dailyLimits,
        monthly: wallet.monthlyLimits,
      },
    }
  }

  // Payment Gateway Endpoints

  @Get('supported-methods')
  async getSupportedPaymentMethods() {
    return this.paymentService.getAllSupportedPaymentMethods()
  }

  @Get('supported-currencies')
  async getSupportedCurrencies() {
    return {
      currencies: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
        { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX' },
        { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
        { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
        { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
        { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      ]
    }
  }

  @Get('payment-gateways')
  async getAvailableGateways(
    @Query('currency') currency: string = 'USD',
    @Query('country') country?: string,
  ) {
    // Mock payment gateways with M-Pesa support
    const gateways = [
      {
        name: 'stripe',
        displayName: 'Stripe',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedCountries: ['US', 'GB', 'EU'],
        paymentMethods: ['card', 'bank_transfer'],
        fees: { percentage: 2.9, fixed: 0.30 }
      },
      {
        name: 'flutterwave',
        displayName: 'Flutterwave',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'UGX', 'GHS', 'ZAR'],
        supportedCountries: ['NG', 'KE', 'UG', 'GH', 'ZA', 'US', 'GB'],
        paymentMethods: ['card', 'bank_transfer', 'mobile_money', 'mpesa'],
        fees: { percentage: 1.4, fixed: 0 }
      },
      {
        name: 'paystack',
        displayName: 'Paystack',
        supportedCurrencies: ['NGN', 'USD', 'GHS', 'ZAR'],
        supportedCountries: ['NG', 'GH', 'ZA'],
        paymentMethods: ['card', 'bank_transfer', 'mobile_money'],
        fees: { percentage: 1.5, fixed: 0 }
      },
      {
        name: 'mpesa',
        displayName: 'M-Pesa',
        supportedCurrencies: ['KES', 'UGX', 'TZS'],
        supportedCountries: ['KE', 'UG', 'TZ'],
        paymentMethods: ['mobile_money'],
        fees: { percentage: 0, fixed: 5 },
        logo: '/images/mpesa-logo.png'
      },
      {
        name: 'paypal',
        displayName: 'PayPal',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedCountries: ['US', 'GB', 'EU', 'CA', 'AU'],
        paymentMethods: ['paypal_account', 'card'],
        fees: { percentage: 3.4, fixed: 0.30 }
      }
    ]

    // Filter gateways based on currency and country
    let filteredGateways = gateways.filter(gateway => 
      gateway.supportedCurrencies.includes(currency)
    )

    if (country) {
      filteredGateways = filteredGateways.filter(gateway =>
        gateway.supportedCountries.includes(country)
      )
    }

    return filteredGateways
  }

  @Get('gateway-stats')
  async getGatewayStats() {
    return this.paymentService.getGatewayStats()
  }

  @Post('deposit')
  async initiateDeposit(
    @Request() req,
    @Body() body: {
      amount: number
      currency: string
      phone?: string
      gatewayName?: string
      country?: string
      metadata?: any
    },
  ) {
    const { amount, currency, phone, gatewayName, country, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    if (!currency) {
      throw new BadRequestException('Currency is required')
    }

    const paymentRequest = {
      amount,
      currency,
      userId: req.user.userId,
      email: req.user.email,
      phone,
      description: 'Wallet deposit',
      metadata,
      callbackUrl: `${process.env.API_URL}/wallet/webhooks/${gatewayName || 'callback'}`,
      redirectUrl: `${process.env.CLIENT_URL}/wallet?status=success`,
    }

    const response = await this.paymentService.initiateDeposit(
      paymentRequest,
      gatewayName,
      country
    )

    return {
      success: response.success,
      transactionId: response.transactionId,
      paymentUrl: response.paymentUrl,
      status: response.status,
      message: response.message,
    }
  }

  @Post('withdraw')
  async initiateWithdrawal(
    @Request() req,
    @Body() body: {
      amount: number
      currency: string
      withdrawalDetails: {
        bankAccount?: {
          accountNumber: string
          bankCode: string
          accountName: string
        }
        mobileWallet?: {
          phoneNumber: string
          provider: string
        }
      }
      gatewayName?: string
      country?: string
      metadata?: any
    },
  ) {
    const { amount, currency, withdrawalDetails, gatewayName, country, metadata = {} } = body

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive')
    }

    if (!currency) {
      throw new BadRequestException('Currency is required')
    }

    if (!withdrawalDetails.bankAccount && !withdrawalDetails.mobileWallet) {
      throw new BadRequestException('Bank account or mobile wallet details are required')
    }

    const withdrawalRequest = {
      amount,
      currency,
      userId: req.user.userId,
      email: req.user.email,
      bankAccount: withdrawalDetails.bankAccount,
      mobileWallet: withdrawalDetails.mobileWallet,
      metadata,
    }

    const response = await this.paymentService.initiateWithdrawal(
      withdrawalRequest,
      gatewayName,
      country
    )

    return {
      success: response.success,
      transactionId: response.transactionId,
      status: response.status,
      message: response.message,
    }
  }

  @Post('verify/:transactionId')
  async verifyTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() body: {
      gatewayName: string
      type: 'deposit' | 'withdrawal'
    },
  ) {
    const { gatewayName, type } = body

    if (!gatewayName) {
      throw new BadRequestException('Gateway name is required')
    }

    if (!type) {
      throw new BadRequestException('Transaction type is required')
    }

    let response
    if (type === 'deposit') {
      response = await this.paymentService.verifyDeposit(transactionId, gatewayName)
    } else {
      response = await this.paymentService.verifyWithdrawal(transactionId, gatewayName)
    }

    return {
      success: response.success,
      status: response.status,
      message: response.message,
      metadata: response.metadata,
    }
  }

}

// Webhook endpoints (no authentication required)
@Controller('wallet/webhooks')
export class WalletWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}

  @Post('flutterwave')
  async handleFlutterwaveWebhook(
    @Body() payload: any,
    @Request() req,
  ) {
    const signature = req.headers['verif-hash']
    
    const result = await this.paymentService.handleWebhook('flutterwave', payload, signature)
    
    if (result) {
      // Process the webhook result (update transaction status, etc.)
      await this.processWebhookResult(result)
    }

    return { status: 'success' }
  }

  @Post('paystack')
  async handlePaystackWebhook(
    @Body() payload: any,
    @Request() req,
  ) {
    const signature = req.headers['x-paystack-signature']
    
    const result = await this.paymentService.handleWebhook('paystack', payload, signature)
    
    if (result) {
      await this.processWebhookResult(result)
    }

    return { status: 'success' }
  }

  @Post('stripe')
  async handleStripeWebhook(
    @Body() payload: any,
    @Request() req,
  ) {
    const signature = req.headers['stripe-signature']
    
    const result = await this.paymentService.handleWebhook('stripe', payload, signature)
    
    if (result) {
      await this.processWebhookResult(result)
    }

    return { status: 'success' }
  }

  @Post('mpesa')
  async handleMpesaWebhook(
    @Body() payload: any,
  ) {
    const result = await this.paymentService.handleWebhook('mpesa', payload)
    
    if (result) {
      await this.processWebhookResult(result)
    }

    return { status: 'success' }
  }

  @Post('paypal')
  async handlePaypalWebhook(
    @Body() payload: any,
    @Request() req,
  ) {
    const signature = req.headers['paypal-transmission-sig']
    
    const result = await this.paymentService.handleWebhook('paypal', payload, signature)
    
    if (result) {
      await this.processWebhookResult(result)
    }

    return { status: 'success' }
  }

  private async processWebhookResult(result: {
    transactionId: string
    status: string
    amount?: number
    metadata?: any
  }) {
    // Update transaction status in database
    await this.transactionService.updateTransactionStatus(
      result.transactionId,
      result.status,
      result.metadata
    )

    // If transaction is completed, update wallet balance
    if (result.status === 'completed' && result.amount) {
      // Extract user ID from transaction ID or metadata
      const transaction = await this.transactionService.getTransactionByReference(result.transactionId)
      if (transaction && transaction.type === 'deposit') {
        await this.walletService.addFunds(
          transaction.userId.toString(),
          result.amount,
          'deposit',
          result.metadata
        )
      }
    }
  }
}