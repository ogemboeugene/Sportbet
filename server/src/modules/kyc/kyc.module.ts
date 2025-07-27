import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'
import { KycController } from './kyc.controller'
import { KycService } from './kyc.service'
import { SumsubService } from './services/sumsub.service'
import { UsersModule } from '../users/users.module'
import { KycDocument, KycDocumentSchema } from '../../database/schemas/kyc-document.schema'

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: KycDocument.name, schema: KycDocumentSchema },
    ]),
  ],
  controllers: [KycController],
  providers: [KycService, SumsubService],
  exports: [KycService],
})
export class KycModule {}