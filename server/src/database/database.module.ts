import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'
import { UssdSession, UssdSessionSchema } from './schemas/ussd-session.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UssdSession.name, schema: UssdSessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}