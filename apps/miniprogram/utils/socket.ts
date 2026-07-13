import { store } from "../store/index";
import { config } from "./config";

const io = require("weapp.socket.io");

export class PracticeRoomSocket {
  private socket: any;
  private currentRoomCode: string | null = null;
  private reconnectHandlers: Array<() => void> = [];
  private heartbeatTimer: number | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    if (!this.socket) {
      this.socket = io(config.wsBaseUrl, {
        transports: ["websocket"],
        query: {
          token: store.getState().token
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      this.socket.on("connect", () => {
        console.log("[WS] connected");
        if (this.currentRoomCode) {
          this.joinRoom(this.currentRoomCode);
        }
        this.startHeartbeat();
      });

      this.socket.on("disconnect", (reason: string) => {
        console.log("[WS] disconnected:", reason);
        this.stopHeartbeat();
      });

      this.socket.on("reconnect", () => {
        console.log("[WS] reconnected");
        if (this.currentRoomCode) {
          this.joinRoom(this.currentRoomCode);
        }
        this.reconnectHandlers.forEach((handler) => handler());
      });

      this.socket.on("reconnect_attempt", () => {
        console.log("[WS] reconnect attempt");
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("[WS] connect error:", error?.message || error);
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  onReconnect(handler: () => void) {
    this.reconnectHandlers.push(handler);
  }

  joinRoom(roomCode: string) {
    this.currentRoomCode = roomCode;
    this.connect().emit("join_room", { roomCode });
  }

  leaveRoom(roomCode: string) {
    this.socket?.emit("leave_room", { roomCode });
    if (this.currentRoomCode === roomCode) {
      this.currentRoomCode = null;
    }
  }

  confirmInitialChips(roomCode: string) {
    this.connect().emit("confirm_initial_chips", { roomCode });
  }

  ready(roomCode: string, readyStatus = true) {
    this.connect().emit("player_ready", { roomCode, readyStatus });
  }

  start(roomCode: string) {
    this.connect().emit("start_room", { roomCode });
  }

  getGameState(roomCode: string) {
    this.connect().emit("get_game_state", { roomCode });
  }

  gameAction(roomCode: string, actionType: string, amount?: number) {
    this.connect().emit("game_action", { roomCode, actionType, amount });
  }

  nextHand(roomCode: string) {
    this.connect().emit("next_hand", { roomCode });
  }

  endRoom(roomCode: string) {
    this.connect().emit("end_room", { roomCode });
  }

  on(eventName: string, handler: (payload: any) => void) {
    this.connect().on(eventName, handler);
  }

  off(eventName: string, handler?: (payload: any) => void) {
    this.socket?.off(eventName, handler);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  close() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
    this.currentRoomCode = null;
    this.reconnectHandlers = [];
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected && this.currentRoomCode) this.socket.emit("heartbeat");
    }, 20000) as any;
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}

export const practiceRoomSocket = new PracticeRoomSocket();
