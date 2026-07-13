import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class UpdateSystemConfigDto {
  @ApiProperty({
    example: {
      defaultPracticeChips: 10000,
      allowedPlayerCounts: [2, 6, 9],
      defaultBlinds: [{ smallBlind: 50, bigBlind: 100 }]
    }
  })
  @IsObject()
  config: Record<string, unknown>;
}
