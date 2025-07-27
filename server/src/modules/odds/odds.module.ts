import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OddsController } from './odds.controller';
import { OddsService } from './services/odds.service';
import { OddsApiService } from './services/odds-api.service';
import { CacheService } from './services/cache.service';
import { SeedService } from './services/seed.service';
import { Sport, SportSchema } from '../../database/schemas/sport.schema';
import { Event, EventSchema } from '../../database/schemas/event.schema';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Sport.name, schema: SportSchema },
      { name: Event.name, schema: EventSchema },
    ]),
  ],
  controllers: [OddsController],
  providers: [OddsService, OddsApiService, CacheService, SeedService],
  exports: [OddsService, CacheService, SeedService],
})
export class OddsModule {}