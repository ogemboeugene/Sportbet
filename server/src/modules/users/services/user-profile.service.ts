import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../database/schemas/user.schema';
import { Sport, SportDocument } from '../../../database/schemas/sport.schema';
import { Event, EventDocument } from '../../../database/schemas/event.schema';
import { UpdateProfileDto } from '../dto/update-profile.dto';

export interface FavoriteTeam {
  teamName: string;
  sportKey: string;
  addedAt: Date;
}

export interface FavoriteSport {
  sportKey: string;
  sportTitle: string;
  addedAt: Date;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Sport.name) private sportModel: Model<SportDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async getUserProfile(userId: string) {
    try {
      const user = await this.userModel
        .findById(userId)
        .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user._id,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        limits: user.limits,
        kycStatus: user.kycStatus,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        favorites: user.favorites || { teams: [], sports: [] },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      this.logger.error(`Failed to get user profile for ${userId}:`, error);
      throw error;
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update profile fields
      if (updateProfileDto.firstName) {
        user.profile.firstName = updateProfileDto.firstName;
      }
      if (updateProfileDto.lastName) {
        user.profile.lastName = updateProfileDto.lastName;
      }
      if (updateProfileDto.phoneNumber) {
        user.profile.phoneNumber = updateProfileDto.phoneNumber;
      }
      if (updateProfileDto.dateOfBirth) {
        user.profile.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
      }
      if (updateProfileDto.address) {
        user.profile.address = updateProfileDto.address;
      }
      if (updateProfileDto.city) {
        user.profile.city = updateProfileDto.city;
      }
      if (updateProfileDto.country) {
        user.profile.country = updateProfileDto.country;
      }
      if (updateProfileDto.postalCode) {
        user.profile.postalCode = updateProfileDto.postalCode;
      }

      user.updatedAt = new Date();
      await user.save();

      return {
        success: true,
        data: user.profile,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to update profile for user ${userId}:`, error);
      throw error;
    }
  }

  async getFavoriteTeams(userId: string): Promise<FavoriteTeam[]> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user.favorites?.teams || [];
    } catch (error) {
      this.logger.error(`Failed to get favorite teams for user ${userId}:`, error);
      throw error;
    }
  }

  async addFavoriteTeam(userId: string, teamName: string, sportKey: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify sport exists
      const sport = await this.sportModel.findOne({ key: sportKey });
      if (!sport) {
        throw new BadRequestException('Invalid sport key');
      }

      // Initialize favorites if not exists
      if (!user.favorites) {
        user.favorites = { teams: [], sports: [] };
      }
      if (!user.favorites.teams) {
        user.favorites.teams = [];
      }

      // Check if team is already in favorites
      const existingTeam = user.favorites.teams.find(
        team => team.teamName === teamName && team.sportKey === sportKey
      );

      if (existingTeam) {
        throw new BadRequestException('Team is already in favorites');
      }

      // Add team to favorites
      user.favorites.teams.push({
        teamName,
        sportKey,
        addedAt: new Date()
      });

      await user.save();

      return {
        success: true,
        data: user.favorites.teams,
        message: 'Team added to favorites successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to add favorite team for user ${userId}:`, error);
      throw error;
    }
  }

  async removeFavoriteTeam(userId: string, teamName: string, sportKey: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.favorites?.teams) {
        throw new BadRequestException('No favorite teams found');
      }

      // Remove team from favorites
      user.favorites.teams = user.favorites.teams.filter(
        team => !(team.teamName === teamName && team.sportKey === sportKey)
      );

      await user.save();

      return {
        success: true,
        data: user.favorites.teams,
        message: 'Team removed from favorites successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to remove favorite team for user ${userId}:`, error);
      throw error;
    }
  }

  async getFavoriteSports(userId: string): Promise<FavoriteSport[]> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user.favorites?.sports || [];
    } catch (error) {
      this.logger.error(`Failed to get favorite sports for user ${userId}:`, error);
      throw error;
    }
  }

  async addFavoriteSport(userId: string, sportKey: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify sport exists
      const sport = await this.sportModel.findOne({ key: sportKey });
      if (!sport) {
        throw new BadRequestException('Invalid sport key');
      }

      // Initialize favorites if not exists
      if (!user.favorites) {
        user.favorites = { teams: [], sports: [] };
      }
      if (!user.favorites.sports) {
        user.favorites.sports = [];
      }

      // Check if sport is already in favorites
      const existingSport = user.favorites.sports.find(
        favSport => favSport.sportKey === sportKey
      );

      if (existingSport) {
        throw new BadRequestException('Sport is already in favorites');
      }

      // Add sport to favorites
      user.favorites.sports.push({
        sportKey,
        sportTitle: sport.title,
        addedAt: new Date()
      });

      await user.save();

      return {
        success: true,
        data: user.favorites.sports,
        message: 'Sport added to favorites successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to add favorite sport for user ${userId}:`, error);
      throw error;
    }
  }

  async removeFavoriteSport(userId: string, sportKey: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.favorites?.sports) {
        throw new BadRequestException('No favorite sports found');
      }

      // Remove sport from favorites
      user.favorites.sports = user.favorites.sports.filter(
        sport => sport.sportKey !== sportKey
      );

      await user.save();

      return {
        success: true,
        data: user.favorites.sports,
        message: 'Sport removed from favorites successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to remove favorite sport for user ${userId}:`, error);
      throw error;
    }
  }

  async getFavoriteTeamEvents(userId: string, limit: number = 20) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const favoriteTeams = user.favorites?.teams || [];
      if (favoriteTeams.length === 0) {
        return [];
      }

      // Get upcoming events for favorite teams
      const teamNames = favoriteTeams.map(team => team.teamName);
      const events = await this.eventModel
        .find({
          $and: [
            {
              $or: [
                { homeTeam: { $in: teamNames } },
                { awayTeam: { $in: teamNames } }
              ]
            },
            {
              startTime: { $gt: new Date() }
            },
            {
              status: { $in: ['upcoming', 'live'] }
            }
          ]
        })
        .sort({ startTime: 1 })
        .limit(limit);

      return events.map(event => ({
        eventId: event.eventId,
        sportKey: event.sportKey,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startTime,
        status: event.status,
        markets: event.markets?.slice(0, 3) || [], // Show first 3 markets
        isFavoriteTeam: true,
        favoriteTeam: teamNames.includes(event.homeTeam) ? event.homeTeam : event.awayTeam
      }));
    } catch (error) {
      this.logger.error(`Failed to get favorite team events for user ${userId}:`, error);
      throw error;
    }
  }

  async getFavoriteSportEvents(userId: string, limit: number = 20) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const favoriteSports = user.favorites?.sports || [];
      if (favoriteSports.length === 0) {
        return [];
      }

      // Get upcoming events for favorite sports
      const sportKeys = favoriteSports.map(sport => sport.sportKey);
      const events = await this.eventModel
        .find({
          sportKey: { $in: sportKeys },
          startTime: { $gt: new Date() },
          status: { $in: ['upcoming', 'live'] }
        })
        .sort({ startTime: 1 })
        .limit(limit);

      return events.map(event => ({
        eventId: event.eventId,
        sportKey: event.sportKey,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        startTime: event.startTime,
        status: event.status,
        markets: event.markets?.slice(0, 3) || [], // Show first 3 markets
        isFavoriteSport: true
      }));
    } catch (error) {
      this.logger.error(`Failed to get favorite sport events for user ${userId}:`, error);
      throw error;
    }
  }

  async getQuickBettingAccess(userId: string) {
    try {
      const [favoriteTeamEvents, favoriteSportEvents] = await Promise.all([
        this.getFavoriteTeamEvents(userId, 10),
        this.getFavoriteSportEvents(userId, 10)
      ]);

      // Combine and deduplicate events
      const allEvents = [...favoriteTeamEvents, ...favoriteSportEvents];
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.eventId === event.eventId)
      );

      // Sort by start time
      uniqueEvents.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      return {
        quickBetEvents: uniqueEvents.slice(0, 15),
        favoriteTeamCount: favoriteTeamEvents.length,
        favoriteSportCount: favoriteSportEvents.length
      };
    } catch (error) {
      this.logger.error(`Failed to get quick betting access for user ${userId}:`, error);
      throw error;
    }
  }
}
