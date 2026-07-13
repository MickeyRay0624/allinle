import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class WxLoginDto {
  @ApiProperty({ description: "wx.login 返回的 code" })
  @IsString()
  @IsNotEmpty()
  code: string;

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
