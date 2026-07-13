import { ApiPropertyOptional } from "@nestjs/swagger";
import { LedgerGameStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from "class-validator";

export class UpdateLedgerGameDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  blindLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  gameDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: LedgerGameStatus })
  @IsOptional()
  @IsEnum(LedgerGameStatus)
  status?: LedgerGameStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
