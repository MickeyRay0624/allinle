import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LedgerGameType } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from "class-validator";
import { Type } from "class-transformer";

export class CreateLedgerGameDto {
  @ApiProperty({ enum: LedgerGameType })
  @IsEnum(LedgerGameType)
  type: LedgerGameType;

  @ApiProperty({ description: "牌局标题" })
  @IsString()
  @MaxLength(80)
  title: string;

  @ApiPropertyOptional({ description: "盲注级别，例如 1/2" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  blindLevel?: string;

  @ApiProperty({ description: "牌局日期，ISO 字符串" })
  @IsDateString()
  gameDate: string;

  @ApiPropertyOptional({ description: "团队记账时必填" })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: "时长，分钟" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: "个人局初始化玩家名" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  initialDisplayName?: string;

  @ApiPropertyOptional({ description: "个人局初始买入" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBuyIn?: number;

  @ApiPropertyOptional({ description: "个人局初始带出" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialCashOut?: number;
}
