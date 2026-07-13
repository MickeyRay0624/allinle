import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateMeDto {
  @ApiPropertyOptional({ description: "昵称" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MinLength(2, { message: "昵称至少需要2个字符" })
  @MaxLength(40)
  nickname?: string;

  @ApiPropertyOptional({ description: "头像 URL" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
