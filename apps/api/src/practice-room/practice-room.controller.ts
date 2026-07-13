import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { GameActionDto } from "../practice-game/dto/game-action.dto";
import { PracticeGameService } from "../practice-game/practice-game.service";
import { CreatePracticeRoomDto } from "./dto/create-practice-room.dto";
import { CreateSoloPracticeDto } from "./dto/create-solo-practice.dto";
import { JoinPracticeRoomDto } from "./dto/join-practice-room.dto";
import { ReadyPracticeRoomDto } from "./dto/ready-practice-room.dto";
import { PracticeRoomService } from "./practice-room.service";

@ApiTags("Practice Room")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("practice")
export class PracticeRoomController {
  constructor(
    private readonly practiceRoomService: PracticeRoomService,
    private readonly practiceGameService: PracticeGameService
  ) {}

  @Post("rooms")
  createRoom(@CurrentUser() user: RequestUser, @Body() dto: CreatePracticeRoomDto) {
    return this.practiceRoomService.createFriendsRoom(user.id, dto);
  }

  @Get("rooms/:roomCode")
  getRoom(@Param("roomCode") roomCode: string) {
    return this.practiceRoomService.getRoomStateByCode(roomCode);
  }

  @Post("rooms/:roomCode/join")
  joinRoom(
    @CurrentUser() user: RequestUser,
    @Param("roomCode") roomCode: string,
    @Body() dto: JoinPracticeRoomDto
  ) {
    return this.practiceRoomService.joinRoom(user.id, roomCode, dto);
  }

  @Post("rooms/:roomCode/confirm-initial-chips")
  confirmInitialChips(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceRoomService.confirmInitialChips(user.id, roomCode);
  }

  @Post("rooms/:roomCode/ready")
  ready(
    @CurrentUser() user: RequestUser,
    @Param("roomCode") roomCode: string,
    @Body() dto: ReadyPracticeRoomDto
  ) {
    return this.practiceRoomService.setReady(user.id, roomCode, dto.readyStatus ?? true);
  }

  @Post("rooms/:roomCode/start")
  startRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.startFirstHand(user.id, roomCode);
  }

  @Get("rooms/:roomCode/game-state")
  getGameState(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.getGameState(user.id, roomCode);
  }

  @Post("rooms/:roomCode/actions")
  gameAction(
    @CurrentUser() user: RequestUser,
    @Param("roomCode") roomCode: string,
    @Body() dto: GameActionDto
  ) {
    return this.practiceGameService.applyAction(user.id, roomCode, dto);
  }

  @Post("rooms/:roomCode/next-hand")
  nextHand(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.nextHand(user.id, roomCode);
  }

  @Post("rooms/:roomCode/end")
  endRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.endRoom(user.id, roomCode);
  }

  @Get("rooms/:roomCode/hands")
  listHands(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.listHands(user.id, roomCode);
  }

  @Get("rooms/:roomCode/latest-hand-replay")
  getLatestHandReplay(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.getLatestHandReplay(user.id, roomCode);
  }

  @Get("rooms/:roomCode/stats")
  getRoomStats(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceGameService.getRoomStats(user.id, roomCode);
  }

  @Get("hands/:handId/replay")
  getHandReplay(@CurrentUser() user: RequestUser, @Param("handId") handId: string) {
    return this.practiceGameService.getHandReplay(user.id, handId);
  }

  @Get("hands/:handId")
  getHand(@CurrentUser() user: RequestUser, @Param("handId") handId: string) {
    return this.practiceGameService.getHand(user.id, handId);
  }

  @Post("rooms/:roomCode/close")
  closeRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) {
    return this.practiceRoomService.closeRoom(user.id, roomCode);
  }

  @Post("solo/create")
  async createSolo(@CurrentUser() user: RequestUser, @Body() dto: CreateSoloPracticeDto) {
    const room = await this.practiceRoomService.createSoloRoom(user.id, dto);
    return this.practiceGameService.startFirstHand(user.id, room.roomCode);
  }

  @Get("solo/:roomId")
  getSolo(@CurrentUser() user: RequestUser, @Param("roomId") roomId: string) {
    return this.practiceRoomService.getSoloRoom(user.id, roomId);
  }
}
