import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PracticeRoomMode } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreatePracticeRoomDto {
  @ApiPropertyOptional({ enum: PracticeRoomMode, description: "第一阶段只支持 FRIENDS" })
  @IsOptional()
  @IsEnum(PracticeRoomMode)
  mode?: PracticeRoomMode;

  @ApiProperty({ description: "人数" })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(9)
  playerCount: number;

  @ApiProperty({ description: "小盲，模拟练习筹码单位" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  smallBlind: number;

  @ApiProperty({ description: "大盲，模拟练习筹码单位" })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  bigBlind: number;

  @ApiProperty({ description: "初始模拟练习筹码" })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  initialPracticeChips: number;

  @ApiPropertyOptional({ description: "房间备注，仅用于风控检查，不做公开展示" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
