import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { DevLoginDto } from "./dto/dev-login.dto";
import { WxLoginDto } from "./dto/wx-login.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("dev-login")
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto);
  }

  @Post("wx-login")
  wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }
}
