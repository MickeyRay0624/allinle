import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { AdminRole } from "@prisma/client";

export class CreateAdminDto {
  @ApiProperty({ description: "管理员用户名" })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ description: "管理员密码" })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ description: "管理员角色", enum: AdminRole, required: false })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
