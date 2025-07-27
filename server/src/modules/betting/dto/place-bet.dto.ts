import { IsNotEmpty, IsNumber, IsArray, IsString, IsOptional, Min, Max, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BetSelection } from '../../../database/schemas/bet.schema';

export class BetSelectionDto implements BetSelection {
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @IsNotEmpty()
  @IsString()
  marketId: string;

  @IsNotEmpty()
  @IsString()
  selectionId: string;

  @IsNumber()
  @Min(1.01)
  @Max(1000)
  odds: number;

  @IsNotEmpty()
  @IsString()
  eventName: string;

  @IsNotEmpty()
  @IsString()
  marketName: string;

  @IsNotEmpty()
  @IsString()
  selectionName: string;

  @IsNotEmpty()
  startTime: Date;

  @IsOptional()
  @IsString()
  status: 'pending' | 'won' | 'lost' | 'void' = 'pending';
}

export class PlaceBetDto {
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  stake: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BetSelectionDto)
  selections: BetSelectionDto[];

  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}