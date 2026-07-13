import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMeDto {
  @ApiPropertyOptional({ description: "昵称" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  nickname?: string;

  @ApiPropertyOptional({ description: "头像 URL" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
