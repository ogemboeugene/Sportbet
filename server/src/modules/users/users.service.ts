import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../../database/schemas/user.schema'

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData)
    return user.save()
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec()
  }

  async updateById(id: string, updateData: Partial<User>): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec()
    
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    return user
  }

  async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { preferences } },
        { new: true }
      )
      .exec()
    
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    return user
  }

  async updateLimits(id: string, limits: Partial<User['limits']>): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { limits } },
        { new: true }
      )
      .exec()
    
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    return user
  }

  async deleteById(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec()
    
    if (!result) {
      throw new NotFoundException('User not found')
    }
  }

  async findAll(page = 1, limit = 10): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit
    
    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments().exec(),
    ])

    return { users, total }
  }

  async updateKycStatus(id: string, kycStatus: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { kycStatus },
        { new: true }
      )
      .exec()
    
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    return user
  }

  async findByPhone(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ 'profile.phoneNumber': phoneNumber }).exec()
  }

  async createUssdUser(userData: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    ussdPin: string;
    emailVerified: boolean;
    kycStatus: string;
  }): Promise<UserDocument> {
    const user = new this.userModel({
      ...userData,
      passwordHash: 'ussd_user', // Placeholder for USSD-only users
      profile: {
        ...userData.profile,
        dateOfBirth: new Date('1990-01-01'), // Default date
        country: 'Unknown',
      },
    });
    
    return user.save();
  }

  async updateUssdPin(id: string, ussdPin: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { ussdPin },
        { new: true }
      )
      .exec()
    
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    return user
  }
}