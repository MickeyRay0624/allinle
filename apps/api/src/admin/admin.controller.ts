import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole } from "@prisma/client";
import {
  CurrentUser,
  RequestUser,
} from "../common/decorators/current-user.decorator";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AdminService } from "./admin.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateAdminStatusDto } from "./dto/update-admin-status.dto";
import { UpdateSystemConfigDto } from "./dto/update-system-config.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("auth/login")
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("auth/me")
  getMe(@CurrentUser() admin: RequestUser) {
    return this.adminService.getMe(admin.id);
  }

  // ---- Admin User Management ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Post("users/admins")
  createAdmin(
    @CurrentUser() admin: RequestUser,
    @Body() dto: CreateAdminDto,
  ) {
    this.adminService.requireSuperAdmin(admin.role as AdminRole);
    return this.adminService.createAdmin(admin.id, admin.role as AdminRole, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("users/admins")
  listAdminUsers(@CurrentUser() admin: RequestUser) {
    return this.adminService.listAdminUsers(admin.role as AdminRole);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Patch("users/admins/:id/password")
  resetAdminPassword(
    @CurrentUser() admin: RequestUser,
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.adminService.resetAdminPassword(
      admin.id,
      admin.role as AdminRole,
      id,
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Patch("users/admins/:id/status")
  updateAdminStatus(
    @CurrentUser() admin: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateAdminStatusDto,
  ) {
    return this.adminService.updateAdminStatus(
      admin.id,
      admin.role as AdminRole,
      id,
      dto,
    );
  }

  // ---- Audit Logs ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("audit-logs")
  listAuditLogs(@CurrentUser() admin: RequestUser) {
    this.adminService.requireAdmin(admin.role as AdminRole);
    return this.adminService.listAuditLogs();
  }

  // ---- Dashboard ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  // ---- App User Management ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("users")
  users() {
    return this.adminService.listUsers();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Patch("users/:id/status")
  updateUserStatus(
    @CurrentUser() admin: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, id, dto);
  }

  // ---- Ledger Games ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("ledger-games")
  ledgerGames() {
    return this.adminService.listLedgerGames();
  }

  // ---- Practice ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("practice-rooms")
  practiceRooms() {
    return this.adminService.listPracticeRooms();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("practice-hands")
  practiceHands() {
    return this.adminService.listPracticeHands();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("practice-hands/:id")
  practiceHand(@Param("id") id: string) {
    return this.adminService.getPracticeHand(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Post("practice-rooms/:id/close")
  closePracticeRoom(
    @CurrentUser() admin: RequestUser,
    @Param("id") id: string,
  ) {
    return this.adminService.closePracticeRoom(admin.id, id);
  }

  // ---- Risk Logs ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("risk-logs")
  riskLogs() {
    return this.adminService.listRiskLogs();
  }

  // ---- System Config ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("system-config")
  systemConfig() {
    return this.adminService.getSystemConfig();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Patch("system-config")
  updateSystemConfig(
    @CurrentUser() admin: RequestUser,
    @Body() dto: UpdateSystemConfigDto,
  ) {
    return this.adminService.updateSystemConfig(
      admin.id,
      admin.role as AdminRole,
      dto,
    );
  }

  // ---- Team Ledger Rooms ----

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("team-ledger-rooms")
  listTeamLedgerRooms() {
    return this.adminService.listTeamLedgerRooms();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get("team-ledger-rooms/:roomCode")
  getTeamLedgerRoom(@Param("roomCode") roomCode: string) {
    return this.adminService.getTeamLedgerRoom(roomCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Post("team-ledger-rooms/:roomCode/close")
  closeTeamLedgerRoom(
    @CurrentUser() admin: RequestUser,
    @Param("roomCode") roomCode: string,
  ) {
    return this.adminService.closeTeamLedgerRoom(admin.id, roomCode);
  }

}
