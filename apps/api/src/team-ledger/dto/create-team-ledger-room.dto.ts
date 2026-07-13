import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";

export class CreateTeamLedgerRoomDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
