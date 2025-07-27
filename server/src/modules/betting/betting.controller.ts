import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BettingService } from './services/betting.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { Bet } from '../../database/schemas/bet.schema';

@Controller('betting')
@UseGuards(JwtAuthGuard)
export class BettingController {
  constructor(private readonly bettingService: BettingService) {}

  @Post('place-bet')
  @HttpCode(HttpStatus.CREATED)
  async placeBet(
    @Body() placeBetDto: PlaceBetDto,
    @Request() req: any,
  ): Promise<Bet> {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      placedVia: 'web',
    };

    return this.bettingService.placeBet(req.user.userId, placeBetDto, metadata);
  }

  @Post('validate-bet')
  @HttpCode(HttpStatus.OK)
  async validateBet(
    @Body() placeBetDto: PlaceBetDto,
    @Request() req: any,
  ): Promise<any> {
    const validation = await this.bettingService.validateBet(req.user.userId, placeBetDto);
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      potentialWin: validation.isValid 
        ? this.calculatePotentialWin(placeBetDto.selections, placeBetDto.stake)
        : 0,
    };
  }

  @Get('my-bets')
  async getMyBets(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ bets: Bet[]; total: number }> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    
    const bets = this.bettingService.getUserBets(req.user.userId, {
      status,
      limit: limitNum,
      offset: offsetNum
    });
    
    return {
      bets: await bets,
      total: 0 // For now, would need to be implemented properly
    };
  }

  @Get('active-bets')
  async getActiveBets(@Request() req: any): Promise<Bet[]> {
    return this.bettingService.getActiveBets(req.user.userId);
  }

  @Get('stats')
  async getBettingStats(@Request() req: any): Promise<any> {
    return this.bettingService.getBettingStats(req.user.userId);
  }

  @Get('bet/:betId')
  async getBetById(
    @Param('betId') betId: string,
    @Request() req: any,
  ): Promise<Bet | null> {
    return this.bettingService.getBetById(betId, req.user.userId);
  }

  @Get('reference/:reference')
  async getBetByReference(
    @Param('reference') reference: string,
    @Request() req: any,
  ): Promise<Bet | null> {
    return this.bettingService.getBetByReference(reference, req.user.userId);
  }

  @Put('cancel/:betId')
  @HttpCode(HttpStatus.OK)
  async cancelBet(
    @Param('betId') betId: string,
    @Request() req: any,
  ): Promise<Bet> {
    return this.bettingService.cancelBet(betId, req.user.userId);
  }

  private calculatePotentialWin(selections: any[], stake: number): number {
    if (selections.length === 1) {
      return stake * selections[0].odds;
    } else {
      const totalOdds = selections.reduce((acc, selection) => acc * selection.odds, 1);
      return stake * totalOdds;
    }
  }
}