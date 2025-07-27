import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateLimitsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  dailyDeposit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200000)
  weeklyDeposit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500000)
  monthlyDeposit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(25000)
  dailyBetting?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  weeklyBetting?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(250000)
  monthlyBetting?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(1440) // 30 minutes to 24 hours
  sessionTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  dailyLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  weeklyLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  monthlyLoss?: number;
}