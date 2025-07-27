import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { WalletController, WalletWebhookController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { PaymentService } from './services/payment.service'
import { TransactionService } from './services/transaction.service'
import { PaymentGatewayService } from './services/payment-gateway.service'
import { WalletGateway } from './wallet.gateway'
import { WebhookController } from './controllers/webhook.controller'
import { UsersModule } from '../users/users.module'
import { Wallet, WalletSchema } from '../../database/schemas/wallet.schema'
import { Transaction, TransactionSchema } from '../../database/schemas/transaction.schema'

// Payment Gateways
import { FlutterwaveGateway } from './gateways/flutterwave.gateway'
import { PaystackGateway } from './gateways/paystack.gateway'
import { StripeGateway } from './gateways/stripe.gateway'
import { MpesaGateway } from './gateways/mpesa.gateway'
import { PaypalGateway } from './gateways/paypal.gateway'

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [WalletController, WalletWebhookController, WebhookController],
  providers: [
    WalletService,
    PaymentService,
    TransactionService,
    PaymentGatewayService,
    WalletGateway,
    // Payment Gateways
    FlutterwaveGateway,
    PaystackGateway,
    StripeGateway,
    MpesaGateway,
    PaypalGateway,
  ],
  exports: [WalletService, TransactionService, PaymentService, WalletGateway],
})
export class WalletModule {}