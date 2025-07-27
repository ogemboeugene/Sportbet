import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { UssdSessionService } from './services/ussd-session.service';
import { UssdMenuService } from './services/ussd-menu.service';
import { UssdBettingService } from './services/ussd-betting.service';
import { UssdSession, UssdSessionSchema } from '../../database/schemas/ussd-session.schema';
import { BettingModule } from '../betting/betting.module';
import { WalletModule } from '../wallet/wallet.module';
import { OddsModule } from '../odds/odds.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UssdSession.name, schema: UssdSessionSchema }
    ]),
    BettingModule,
    WalletModule,
    OddsModule,
    UsersModule,
  ],
  controllers: [UssdController],
  providers: [
    UssdService,
    UssdSessionService,
    UssdMenuService,
    UssdBettingService,
  ],
  exports: [UssdService],
})
export class UssdModule {}