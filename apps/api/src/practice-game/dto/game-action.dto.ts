import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export enum GameActionDtoType {
  FOLD = "FOLD",
  CHECK = "CHECK",
  CALL = "CALL",
  BET = "BET",
  RAISE = "RAISE",
  ALL_IN = "ALL_IN"
}

export class GameActionDto {
  @IsEnum(GameActionDtoType)
  actionType!: GameActionDtoType;

  @ApiPropertyOptional({
    description: "BET 表示下注额，RAISE 表示加注到的本街总额，其他动作可省略"
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}
