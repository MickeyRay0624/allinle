import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "新密码" })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
