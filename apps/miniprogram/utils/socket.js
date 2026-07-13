"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.practiceRoomSocket = exports.PracticeRoomSocket = void 0;
const index_1 = require("../store/index");
const config_1 = require("./config");
const io = require("weapp.socket.io");
class PracticeRoomSocket {
    constructor() {
        this.currentRoomCode = null;
        this.reconnectHandlers = [];
    }
    connect() {
        if (this.socket?.connected)
            return this.socket;
        if (!this.socket) {
            this.socket = io(config_1.config.wsBaseUrl, {
                transports: ["websocket"],
                query: {
                    token: index_1.store.getState().token
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
            });
            this.socket.on("disconnect", (reason) => {
                console.log("[WS] disconnected:", reason);
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
            this.socket.on("connect_error", (error) => {
                console.error("[WS] connect error:", error?.message || error);
            });
        }
        if (!this.socket.connected) {
            this.socket.connect();
        }
        return this.socket;
    }
    onReconnect(handler) {
        this.reconnectHandlers.push(handler);
    }
    joinRoom(roomCode) {
        this.currentRoomCode = roomCode;
        this.connect().emit("join_room", { roomCode });
    }
    leaveRoom(roomCode) {
        this.socket?.emit("leave_room", { roomCode });
        if (this.currentRoomCode === roomCode) {
            this.currentRoomCode = null;
        }
    }
    confirmInitialChips(roomCode) {
        this.connect().emit("confirm_initial_chips", { roomCode });
    }
    ready(roomCode, readyStatus = true) {
        this.connect().emit("player_ready", { roomCode, readyStatus });
    }
    start(roomCode) {
        this.connect().emit("start_room", { roomCode });
    }
    getGameState(roomCode) {
        this.connect().emit("get_game_state", { roomCode });
    }
    gameAction(roomCode, actionType, amount) {
        this.connect().emit("game_action", { roomCode, actionType, amount });
    }
    nextHand(roomCode) {
        this.connect().emit("next_hand", { roomCode });
    }
    endRoom(roomCode) {
        this.connect().emit("end_room", { roomCode });
    }
    on(eventName, handler) {
        this.connect().on(eventName, handler);
    }
    off(eventName, handler) {
        this.socket?.off(eventName, handler);
    }
    isConnected() {
        return this.socket?.connected ?? false;
    }
    close() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
            this.socket = null;
        }
        this.currentRoomCode = null;
        this.reconnectHandlers = [];
    }
}
exports.PracticeRoomSocket = PracticeRoomSocket;
exports.practiceRoomSocket = new PracticeRoomSocket();
