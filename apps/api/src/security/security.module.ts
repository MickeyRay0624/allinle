import { Module } from "@nestjs/common";
import { SecurityService } from "./security.service";
import { ContentSecurityService } from "./content-security.service";

@Module({
  providers: [SecurityService, ContentSecurityService],
  exports: [SecurityService, ContentSecurityService],
})
export class SecurityModule {}
