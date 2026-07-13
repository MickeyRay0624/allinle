import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class ReadyPracticeRoomDto {
  @ApiPropertyOptional({ description: "是否准备，默认 true" })
  @IsOptional()
  @IsBoolean()
  readyStatus?: boolean;
}
