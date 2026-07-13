import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AddLedgerPlayerDto {
  @ApiProperty({ description: "展示名称，临时玩家可只填名称" })
  @IsString()
  @MaxLength(40)
  displayName: string;

  @ApiPropertyOptional({ description: "绑定用户 ID，可为空" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "初始买入" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyInAmount?: number;

  @ApiPropertyOptional({ description: "初始带出" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashOutAmount?: number;
}
