import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersService } from './users.service'
import { ResponsibleGamblingService } from './services/responsible-gambling.service'
import { SelfExclusionService } from './services/self-exclusion.service'
import { SessionManagementService } from './services/session-management.service'
import { UserDashboardService } from './services/user-dashboard.service'
import { UserProfileService } from './services/user-profile.service'
import { BetHistoryService } from './services/bet-history.service'
import { UsersController } from './users.controller'
import { User, UserSchema } from '../../database/schemas/user.schema'
import { Transaction, TransactionSchema } from '../../database/schemas/transaction.schema'
import { Bet, BetSchema } from '../../database/schemas/bet.schema'
import { Sport, SportSchema } from '../../database/schemas/sport.schema'
import { Event, EventSchema } from '../../database/schemas/event.schema'
import { OddsModule } from '../odds/odds.module'
import { WalletModule } from '../wallet/wallet.module'
import { BettingModule } from '../betting/betting.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Bet.name, schema: BetSchema },
      { name: Sport.name, schema: SportSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    OddsModule, // For CacheService
    forwardRef(() => WalletModule), // For WalletService - prevent circular dependency
    forwardRef(() => BettingModule), // For BettingService - prevent circular dependency
  ],
  controllers: [UsersController],
  providers: [
    UsersService, 
    ResponsibleGamblingService, 
    SelfExclusionService, 
    SessionManagementService,
    UserDashboardService,
    UserProfileService,
    BetHistoryService
  ],
  exports: [
    UsersService, 
    ResponsibleGamblingService, 
    SelfExclusionService, 
    SessionManagementService,
    UserDashboardService,
    UserProfileService,
    BetHistoryService
  ],
})
export class UsersModule {}