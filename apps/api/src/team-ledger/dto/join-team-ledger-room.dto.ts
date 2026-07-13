import { IsOptional, IsString, IsInt, Min } from "class-validator";

export class JoinTeamLedgerRoomDto {
  @IsOptional()
  @IsString()
  displayName?: string;
}
