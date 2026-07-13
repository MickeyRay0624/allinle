import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAdminGuard } from "../guards/jwt-admin.guard";
import { JwtUserGuard } from "../guards/jwt-user.guard";

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev-only-change-me",
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    }),
  ],
  providers: [JwtUserGuard, JwtAdminGuard],
  exports: [JwtModule, JwtUserGuard, JwtAdminGuard],
})
export class CommonModule {}
