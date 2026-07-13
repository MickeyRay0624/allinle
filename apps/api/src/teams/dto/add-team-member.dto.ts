import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TeamRole } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class AddTeamMemberDto {
  @ApiProperty({ description: "用户 ID" })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ enum: TeamRole })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;
}
