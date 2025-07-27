import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { PaymentService } from '../services/payment.service'

@Controller('wallet/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(private readonly paymentService: PaymentService) {}

  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  async handleFlutterwaveWebhook(
    @Body() payload: any,
    @Headers('verif-hash') signature: string,
  ) {
    try {
      this.logger.log('Received Flutterwave webhook')
      await this.paymentService.handleWebhook('flutterwave', payload, signature)
      return { status: 'success' }
    } catch (error) {
      this.logger.error('Flutterwave webhook processing failed', error)
      throw new BadRequestException('Webhook processing failed')
    }
  }

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    try {
      this.logger.log('Received Paystack webhook')
      await this.paymentService.handleWebhook('paystack', payload, signature)
      return { status: 'success' }
    } catch (error) {
      this.logger.error('Paystack webhook processing failed', error)
      throw new BadRequestException('Webhook processing failed')
    }
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      this.logger.log('Received Stripe webhook')
      await this.paymentService.handleWebhook('stripe', payload, signature)
      return { status: 'success' }
    } catch (error) {
      this.logger.error('Stripe webhook processing failed', error)
      throw new BadRequestException('Webhook processing failed')
    }
  }

  @Post('mpesa')
  @HttpCode(HttpStatus.OK)
  async handleMpesaWebhook(@Body() payload: any) {
    try {
      this.logger.log('Received M-Pesa webhook')
      await this.paymentService.handleWebhook('mpesa', payload)
      return { 
        ResultCode: 0,
        ResultDesc: 'Success'
      }
    } catch (error) {
      this.logger.error('M-Pesa webhook processing failed', error)
      return {
        ResultCode: 1,
        ResultDesc: 'Failed'
      }
    }
  }

  @Post('mpesa/timeout')
  @HttpCode(HttpStatus.OK)
  async handleMpesaTimeout(@Body() payload: any) {
    this.logger.warn('M-Pesa transaction timeout', payload)
    return {
      ResultCode: 0,
      ResultDesc: 'Timeout received'
    }
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  async handlePaypalWebhook(
    @Body() payload: any,
    @Headers('paypal-transmission-sig') signature: string,
  ) {
    try {
      this.logger.log('Received PayPal webhook')
      await this.paymentService.handleWebhook('paypal', payload, signature)
      return { status: 'success' }
    } catch (error) {
      this.logger.error('PayPal webhook processing failed', error)
      throw new BadRequestException('Webhook processing failed')
    }
  }

  @Post(':gateway')
  @HttpCode(HttpStatus.OK)
  async handleGenericWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    try {
      this.logger.log(`Received webhook for ${gateway}`)
      
      // Extract signature from common header names
      const signature = headers['x-signature'] || 
                       headers['signature'] || 
                       headers['x-webhook-signature']

      await this.paymentService.handleWebhook(gateway, payload, signature)
      return { status: 'success' }
    } catch (error) {
      this.logger.error(`Generic webhook processing failed for ${gateway}`, error)
      throw new BadRequestException('Webhook processing failed')
    }
  }
}