import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class JoinPracticeRoomDto {
  @ApiPropertyOptional({ description: "加入时的展示名，默认使用用户昵称" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;
}
