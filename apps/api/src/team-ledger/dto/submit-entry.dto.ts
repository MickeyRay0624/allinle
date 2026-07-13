import { IsNumber, IsOptional, IsString } from "class-validator";

export class SubmitEntryDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  disputeNote?: string;
}
