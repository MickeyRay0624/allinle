import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, WechatService],
  exports: [AuthService],
})
export class AuthModule {}
