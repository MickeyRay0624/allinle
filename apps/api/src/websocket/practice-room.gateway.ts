import { BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameActionDto } from "../practice-game/dto/game-action.dto";
import { PracticeGameService } from "../practice-game/practice-game.service";
import { PracticeRoomService } from "../practice-room/practice-room.service";

type RoomPayload = { roomCode: string };
type ReadyPayload = { roomCode: string; readyStatus?: boolean };
type GameActionPayload = RoomPayload & GameActionDto;

@WebSocketGateway({
  namespace: "/practice-room",
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : true,
    credentials: true
  }
})
export class PracticeRoomGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly practiceRoomService: PracticeRoomService,
    private readonly practiceGameService: PracticeGameService
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.emit("error_message", { message: "缺少登录态" });
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || "dev-only-change-me"
      });
      if (payload.scope !== "user") throw new Error("invalid scope");
      client.data.userId = payload.sub;
    } catch {
      client.emit("error_message", { message: "登录态无效" });
      client.disconnect();
    }
  }

  @SubscribeMessage("join_room")
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const gameView = await this.practiceGameService.getGameState(client.data.userId, payload.roomCode);
      client.join(payload.roomCode);
      const state = await this.practiceRoomService.getRoomStateByCode(payload.roomCode);
      this.server.to(payload.roomCode).emit("room_state", state);
      if (gameView.publicState) {
        client.emit("public_game_state", gameView.publicState);
      }
      if (gameView.privateState) {
        client.emit("private_hand_state", gameView.privateState);
      }
      client.to(payload.roomCode).emit("player_joined", {
        userId: client.data.userId,
        roomCode: payload.roomCode
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("leave_room")
  leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    client.leave(payload.roomCode);
    client.to(payload.roomCode).emit("player_left", {
      userId: client.data.userId,
      roomCode: payload.roomCode
    });
  }

  @SubscribeMessage("player_ready")
  async playerReady(@ConnectedSocket() client: Socket, @MessageBody() payload: ReadyPayload) {
    try {
      const state = await this.practiceRoomService.setReady(
        client.data.userId,
        payload.roomCode,
        payload.readyStatus ?? true
      );
      this.server.to(payload.roomCode).emit("player_ready_changed", state);
      this.server.to(payload.roomCode).emit("room_state", state);
      if (state.status === "READY") {
        this.server.to(payload.roomCode).emit("room_ready", state);
      }
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("confirm_initial_chips")
  async confirmInitialChips(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const state = await this.practiceRoomService.confirmInitialChips(
        client.data.userId,
        payload.roomCode
      );
      this.server.to(payload.roomCode).emit("initial_chips_confirmed", state);
      this.server.to(payload.roomCode).emit("room_state", state);
      if (state.status === "READY") {
        this.server.to(payload.roomCode).emit("room_ready", state);
      }
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("start_room")
  async startRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const gameView = await this.practiceGameService.startFirstHand(client.data.userId, payload.roomCode);
      this.server.to(payload.roomCode).emit("room_started", gameView.roomState);
      if (gameView.roomState) {
        this.server.to(payload.roomCode).emit("room_state", gameView.roomState);
      }
      await this.broadcastGameState(payload.roomCode, gameView.publicState);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("get_game_state")
  async getGameState(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const gameView = await this.practiceGameService.getGameState(client.data.userId, payload.roomCode);
      if (gameView.publicState) {
        client.emit("public_game_state", gameView.publicState);
      }
      if (gameView.privateState) {
        client.emit("private_hand_state", gameView.privateState);
      }
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("game_action")
  async gameAction(@ConnectedSocket() client: Socket, @MessageBody() payload: GameActionPayload) {
    try {
      const gameView = (await this.practiceGameService.applyAction(client.data.userId, payload.roomCode, {
        actionType: payload.actionType,
        amount: payload.amount
      })) as any;
      this.server.to(payload.roomCode).emit("action_applied", gameView.appliedAction);
      await this.broadcastGameState(payload.roomCode, gameView.publicState);
      if ((gameView.events as string[] | undefined)?.includes("street_changed")) {
        this.server.to(payload.roomCode).emit("street_changed", gameView.publicState);
      }
      if ((gameView.events as string[] | undefined)?.includes("hand_finished")) {
        this.server.to(payload.roomCode).emit("hand_finished", gameView.publicState);
      }
    } catch (error) {
      this.emitInvalidAction(client, error);
    }
  }

  @SubscribeMessage("next_hand")
  async nextHand(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const gameView = (await this.practiceGameService.nextHand(client.data.userId, payload.roomCode)) as any;
      if ((gameView.events as string[] | undefined)?.includes("room_finished")) {
        this.server.to(payload.roomCode).emit("room_finished", gameView.publicState);
      } else {
        this.server.to(payload.roomCode).emit("next_hand_started", gameView.publicState);
      }
      if (gameView.roomState) {
        this.server.to(payload.roomCode).emit("room_state", gameView.roomState);
      }
      await this.broadcastGameState(payload.roomCode, gameView.publicState);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("end_room")
  async endRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomPayload) {
    try {
      const state = await this.practiceGameService.endRoom(client.data.userId, payload.roomCode);
      this.server.to(payload.roomCode).emit("room_finished", state);
      this.server.to(payload.roomCode).emit("room_state", state);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage("heartbeat")
  async heartbeat(@ConnectedSocket() client: Socket) {
    const roomCodes = [...client.rooms].filter((roomCode) => roomCode !== client.id);
    if (roomCodes.length) {
      await this.practiceRoomService.touchRooms(roomCodes);
    }
    client.emit("heartbeat", { ts: Date.now() });
  }

  broadcastRoomClosed(roomCode: string, state: unknown) {
    this.server.to(roomCode).emit("room_closed", state);
    this.server.to(roomCode).emit("room_state", state);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    const queryToken = client.handshake.query?.token;
    if (typeof authToken === "string") return authToken;
    if (typeof queryToken === "string") return queryToken;
    return undefined;
  }

  private emitError(client: Socket, error: unknown) {
    const message = error instanceof Error ? error.message : "WebSocket 操作失败";
    client.emit("error_message", { message });
    client.emit("game_error", { message });
  }

  private emitInvalidAction(client: Socket, error: unknown) {
    const message = error instanceof Error ? error.message : "行动不合法";
    client.emit("invalid_action", { message });
    if (!(error instanceof BadRequestException)) {
      client.emit("game_error", { message });
    }
  }

  private async broadcastGameState(roomCode: string, publicState: unknown) {
    if (publicState) {
      this.server.to(roomCode).emit("public_game_state", publicState);
    }
    await this.emitPrivateStates(roomCode);
  }

  private async emitPrivateStates(roomCode: string) {
    const privateStates = await this.practiceGameService.getAllPrivateStates(roomCode);
    const sockets = await this.server.in(roomCode).fetchSockets();
    sockets.forEach((socket) => {
      const privateState = privateStates.find((state) => state.userId === socket.data.userId);
      if (privateState) {
        socket.emit("private_hand_state", privateState);
      }
    });
  }
}
