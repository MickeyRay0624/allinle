import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { AddLedgerPlayerDto } from "./dto/add-ledger-player.dto";
import { AddLedgerTransactionDto } from "./dto/add-ledger-transaction.dto";
import { ConfirmLedgerDto } from "./dto/confirm-ledger.dto";
import { CreateLedgerGameDto } from "./dto/create-ledger-game.dto";
import { UpdateLedgerGameDto } from "./dto/update-ledger-game.dto";
import { LedgerService } from "./ledger.service";

@ApiTags("Ledger")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post("games")
  createGame(@CurrentUser() user: RequestUser, @Body() dto: CreateLedgerGameDto) {
    return this.ledgerService.createGame(user.id, dto);
  }

  @Get("games")
  listGames(@CurrentUser() user: RequestUser) {
    return this.ledgerService.listGames(user.id);
  }

  @Get("games/:id")
  getGame(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.ledgerService.getGame(user.id, id);
  }

  @Patch("games/:id")
  updateGame(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateLedgerGameDto
  ) {
    return this.ledgerService.updateGame(user.id, id, dto);
  }

  @Post("games/:id/players")
  addPlayer(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddLedgerPlayerDto
  ) {
    return this.ledgerService.addPlayer(user.id, id, dto);
  }

  @Post("games/:id/transactions")
  addTransaction(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddLedgerTransactionDto
  ) {
    return this.ledgerService.addTransaction(user.id, id, dto);
  }

  @Post("games/:id/finish")
  finishGame(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.ledgerService.finishGame(user.id, id);
  }

  @Post("games/:id/confirm")
  confirmGame(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ConfirmLedgerDto
  ) {
    return this.ledgerService.confirmGame(user.id, id, dto);
  }

  @Post("games/:id/dispute")
  disputeGame(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ConfirmLedgerDto
  ) {
    return this.ledgerService.disputeGame(user.id, id, dto);
  }
}
