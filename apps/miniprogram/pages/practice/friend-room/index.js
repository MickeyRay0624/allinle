"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../../utils/request");
const socket_1 = require("../../../utils/socket");
const index_1 = require("../../../store/index");
let isNavigatingToTable = false;
Page({
    data: {
        roomCode: "",
        room: null,
        connected: false,
        isOwner: false,
        myConfirmChips: false,
        myReady: false,
        canStart: false,
        starting: false,
        lastMessage: ""
    },
    async onLoad(query) {
        isNavigatingToTable = false;
        const roomCode = query.roomCode || "";
        this.setData({ roomCode });
        await (0, request_1.ensureDevLogin)();
        await this.loadRoom();
        this.connectSocket();
    },
    onUnload() {
        if (this.data.roomCode) {
            socket_1.practiceRoomSocket.leaveRoom(this.data.roomCode);
        }
        socket_1.practiceRoomSocket.close();
    },
    async loadRoom() {
        if (!this.data.roomCode)
            return;
        try {
            const room = await request_1.api.get(`/practice/rooms/${this.data.roomCode}`);
            this.updateRoomState(room);
            if (room.status === "PLAYING") {
                this.navigateToTable(room);
            }
        }
        catch (error) {
            this.showError(error);
        }
    },
    connectSocket() {
        socket_1.practiceRoomSocket.on("room_state", (room) => {
            this.updateRoomState(room);
        });
        socket_1.practiceRoomSocket.on("room_started", (room) => {
            this.updateRoomState(room);
            this.navigateToTable(room);
        });
        socket_1.practiceRoomSocket.on("player_ready_changed", (room) => {
            this.updateRoomState(room);
        });
        socket_1.practiceRoomSocket.on("initial_chips_confirmed", (room) => {
            this.updateRoomState(room);
        });
        socket_1.practiceRoomSocket.on("player_joined", () => {
            this.loadRoom();
        });
        socket_1.practiceRoomSocket.on("player_left", () => {
            this.loadRoom();
        });
        socket_1.practiceRoomSocket.on("room_closed", () => {
            wx.showToast({ title: "房间已关闭", icon: "none" });
            setTimeout(() => wx.navigateBack(), 1500);
        });
        socket_1.practiceRoomSocket.on("error_message", (payload) => {
            wx.showToast({ title: payload.message || "房间同步失败", icon: "none" });
        });
        socket_1.practiceRoomSocket.joinRoom(this.data.roomCode);
    },
    updateRoomState(room) {
        if (!room)
            return;
        const userId = index_1.store.getState().user?.id || "";
        const myPlayer = room.players?.find((p) => p.userId === userId);
        const allReady = room.players?.every((p) => p.initialChipsConfirmed && p.readyStatus);
        this.setData({
            room,
            connected: true,
            isOwner: room.ownerId === userId,
            myConfirmChips: myPlayer?.initialChipsConfirmed || false,
            myReady: myPlayer?.readyStatus || false,
            canStart: allReady && room.players?.length >= 2 && room.ownerId === userId
        });
    },
    navigateToTable(room) {
        if (isNavigatingToTable)
            return;
        isNavigatingToTable = true;
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage?.route?.includes("friend-table"))
            return;
        wx.redirectTo({
            url: `/pages/practice/friend-table/index?roomCode=${room.roomCode || this.data.roomCode}`,
            fail: () => {
                isNavigatingToTable = false;
            }
        });
    },
    async confirmChips() {
        try {
            await request_1.api.post(`/practice/rooms/${this.data.roomCode}/confirm-initial-chips`, {});
            socket_1.practiceRoomSocket.confirmInitialChips(this.data.roomCode);
            await this.loadRoom();
        }
        catch (error) {
            this.showError(error);
        }
    },
    async toggleReady() {
        try {
            const newStatus = !this.data.myReady;
            await request_1.api.post(`/practice/rooms/${this.data.roomCode}/ready`, { readyStatus: newStatus });
            socket_1.practiceRoomSocket.ready(this.data.roomCode, newStatus);
            await this.loadRoom();
        }
        catch (error) {
            this.showError(error);
        }
    },
    async startRoom() {
        if (this.data.starting)
            return;
        this.setData({ starting: true });
        try {
            const gameView = await request_1.api.post(`/practice/rooms/${this.data.roomCode}/start`, {});
            socket_1.practiceRoomSocket.start(this.data.roomCode);
            const room = gameView.roomState || gameView;
            this.updateRoomState(room);
            this.navigateToTable(room);
        }
        catch (error) {
            this.setData({ starting: false });
            this.showError(error);
        }
    },
    async leaveRoom() {
        try {
            await request_1.api.post(`/practice/rooms/${this.data.roomCode}/close`, {});
        }
        catch (_) { }
        wx.navigateBack();
    },
    showError(error) {
        wx.showToast({
            title: error instanceof Error ? error.message : "操作失败",
            icon: "none"
        });
    }
});
