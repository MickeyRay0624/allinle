import { IsInt, Max, Min } from "class-validator";

export class SetInitialChipsDto {
  @IsInt()
  @Min(1)
  @Max(1000000)
  chips: number;
}
