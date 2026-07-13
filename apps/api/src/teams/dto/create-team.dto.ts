import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTeamDto {
  @ApiProperty({ description: "团队名称" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;
}
