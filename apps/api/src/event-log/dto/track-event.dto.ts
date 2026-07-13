import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class TrackEventDto {
  @ApiProperty({ description: "事件名称" })
  @IsString()
  eventName!: string;

  @ApiProperty({ description: "事件分组", required: false })
  @IsOptional()
  @IsString()
  eventGroup?: string;

  @ApiProperty({ description: "事件元数据", required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
