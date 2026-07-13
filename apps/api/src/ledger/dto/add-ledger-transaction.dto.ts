import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LedgerTransactionType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class AddLedgerTransactionDto {
  @ApiProperty({ description: "玩家记录 ID" })
  @IsString()
  playerId: string;

  @ApiProperty({ enum: LedgerTransactionType })
  @IsEnum(LedgerTransactionType)
  type: LedgerTransactionType;

  @ApiProperty({ description: "金额，服务端使用 Decimal 保存" })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
