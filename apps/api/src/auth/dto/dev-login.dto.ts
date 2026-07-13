import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class DevLoginDto {
  @ApiPropertyOptional({ description: "开发环境模拟 openid，不传则自动生成" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  openid?: string;

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
