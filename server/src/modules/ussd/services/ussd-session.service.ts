import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UssdSession, UssdSessionDocument } from '../../../database/schemas/ussd-session.schema';

@Injectable()
export class UssdSessionService {
  constructor(
    @InjectModel(UssdSession.name)
    private readonly sessionModel: Model<UssdSessionDocument>,
  ) {}

  async createSession(sessionData: Partial<UssdSession>): Promise<UssdSessionDocument> {
    const session = new this.sessionModel(sessionData);
    return await session.save();
  }

  async getSession(sessionId: string): Promise<UssdSessionDocument | null> {
    return await this.sessionModel.findOne({ 
      sessionId, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
  }

  async updateSession(sessionId: string, updates: Partial<UssdSession>): Promise<UssdSessionDocument | null> {
    return await this.sessionModel.findOneAndUpdate(
      { sessionId, isActive: true },
      { 
        ...updates, 
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // Extend expiry by 5 minutes
      },
      { new: true }
    );
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId, isActive: true },
      { 
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    );
  }

  async endSession(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      { isActive: false }
    );
  }

  async setSessionData(sessionId: string, key: string, value: any): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId, isActive: true },
      { 
        [`sessionData.${key}`]: value,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    );
  }

  async getSessionData(sessionId: string, key: string): Promise<any> {
    const session = await this.getSession(sessionId);
    return session?.sessionData?.[key];
  }

  async navigateToMenu(sessionId: string, menuName: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      const menuHistory = [...session.menuHistory, session.currentMenu];
      await this.updateSession(sessionId, {
        currentMenu: menuName,
        menuHistory,
      });
    }
  }

  async goBack(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId);
    if (session && session.menuHistory.length > 0) {
      const previousMenu = session.menuHistory.pop();
      await this.updateSession(sessionId, {
        currentMenu: previousMenu,
        menuHistory: session.menuHistory,
      });
      return previousMenu;
    }
    return null;
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }
}