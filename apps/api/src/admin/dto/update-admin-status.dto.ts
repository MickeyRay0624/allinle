import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { AdminStatus } from "@prisma/client";

export class UpdateAdminStatusDto {
  @ApiProperty({ description: "管理员状态", enum: AdminStatus })
  @IsEnum(AdminStatus)
  status!: AdminStatus;
}
