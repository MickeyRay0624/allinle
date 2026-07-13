import { Global, Module } from "@nestjs/common";
import { EventLogService } from "./event-log.service";
import { EventLogController } from "./event-log.controller";

@Global()
@Module({
  controllers: [EventLogController],
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
