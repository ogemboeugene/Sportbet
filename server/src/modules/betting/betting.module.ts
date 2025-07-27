import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BettingController } from './betting.controller';
import { AdminBettingController } from './admin-betting.controller';
import { BettingService } from './services/betting.service';
import { BetSettlementService } from './services/bet-settlement.service';
import { Bet, BetSchema } from '../../database/schemas/bet.schema';
import { Event, EventSchema } from '../../database/schemas/event.schema';
import { WalletModule } from '../wallet/wallet.module';
import { OddsModule } from '../odds/odds.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bet.name, schema: BetSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    ScheduleModule.forRoot(),
    WalletModule,
    OddsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [BettingController, AdminBettingController],
  providers: [BettingService, BetSettlementService],
  exports: [BettingService, BetSettlementService],
})
export class BettingModule {}