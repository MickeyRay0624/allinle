import { ApiProperty } from "@nestjs/swagger";
import { BotLevel } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, Min } from "class-validator";

export class CreateSoloPracticeDto {
  @ApiProperty({ enum: [1, 2, 5, 8], description: "机器人数量" })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 5, 8])
  botCount: number;

  @ApiProperty({ enum: BotLevel, description: "机器人难度" })
  @IsEnum(BotLevel)
  botLevel: BotLevel;

  @ApiProperty({ description: "初始模拟练习筹码" })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  initialPracticeChips: number;

  @ApiProperty({ description: "小盲" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  smallBlind: number;

  @ApiProperty({ description: "大盲" })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  bigBlind: number;
}
