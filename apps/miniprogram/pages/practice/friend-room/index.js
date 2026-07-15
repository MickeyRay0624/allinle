"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../../utils/request");
const socket_1 = require("../../../utils/socket");
const index_1 = require("../../../store/index");
let isNavigatingToTable = false;
let roomPollTimer = null;
Page({
    data: {
        roomCode: "",
        room: null,
        connected: false,
        isOwner: false,
        myConfirmChips: false,
        myReady: false,
        myChips: "",
        canStart: false,
        starting: false,
        lastMessage: "",
        displayPlayers: [],
        confirmedCount: 0,
        readyCount: 0,
        readyPercent: 0,
        maxPlayers: 0
    },
    async onLoad(query) {
        isNavigatingToTable = false;
        const roomCode = query.roomCode || "";
        this.setData({ roomCode });
        await (0, request_1.ensureDevLogin)();
        await this.loadRoom();
        this.connectSocket();
        this.startRoomPolling();
    },
    onUnload() {
        if (roomPollTimer !== null)
            clearInterval(roomPollTimer);
        roomPollTimer = null;
        if (this.data.roomCode) {
            socket_1.practiceRoomSocket.leaveRoom(this.data.roomCode);
        }
        socket_1.practiceRoomSocket.close();
    },
    startRoomPolling() {
        if (roomPollTimer !== null)
            clearInterval(roomPollTimer);
        roomPollTimer = setInterval(async () => {
            if (isNavigatingToTable || !this.data.roomCode)
                return;
            try {
                const room = await request_1.api.get(`/practice/rooms/${this.data.roomCode}`);
                this.updateRoomState(room);
                if (room.status === "PLAYING")
                    this.navigateToTable(room);
            }
            catch (_) { }
        }, 2000);
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
        const userId = (wx.getStorageSync("user") || {}).id || index_1.store.getState().user?.id || "";
        const myPlayer = room.players?.find((p) => p.userId === userId);
        const players = Array.isArray(room.players) ? room.players : [];
        const allReady = players.every((p) => p.initialChipsConfirmed && p.readyStatus);
        const confirmedCount = players.filter((p) => p.initialChipsConfirmed).length;
        const readyCount = players.filter((p) => p.readyStatus).length;
        const displayPlayers = players.map((player) => {
            const nickname = String(player.nickname || "成员");
            return {
                ...player,
                nickname,
                initial: nickname.charAt(0).toUpperCase(),
                isMe: player.userId === userId,
                isOwner: player.userId === room.ownerUserId
            };
        });
        this.setData({
            room,
            displayPlayers,
            connected: socket_1.practiceRoomSocket.isConnected(),
            isOwner: room.ownerUserId === userId,
            myChips: myPlayer?.chipsSetByPlayer ? String(myPlayer.chips) : this.data.myChips,
            myConfirmChips: myPlayer?.initialChipsConfirmed || false,
            myReady: myPlayer?.readyStatus || false,
            canStart: allReady && players.length >= 2 && room.ownerUserId === userId,
            confirmedCount,
            readyCount,
            readyPercent: players.length ? Math.round((readyCount / players.length) * 100) : 0,
            maxPlayers: Number(room.playerCount || players.length || 0)
        });
    },
    copyRoomCode() {
        wx.setClipboardData({
            data: this.data.roomCode,
            success: () => wx.showToast({ title: "房间码已复制", icon: "success" })
        });
    },
    onChipsInput(event) {
        this.setData({ myChips: event.detail.value });
    },
    async saveChips() {
        const chips = Number(this.data.myChips);
        if (!Number.isInteger(chips) || chips <= 0) {
            wx.showToast({ title: "请输入正整数筹码", icon: "none" });
            return;
        }
        try {
            const room = await request_1.api.post(`/practice/rooms/${this.data.roomCode}/initial-chips`, { chips });
            this.updateRoomState(room);
            socket_1.practiceRoomSocket.joinRoom(this.data.roomCode);
            wx.showToast({ title: "筹码已提交", icon: "success" });
        }
        catch (error) {
            this.showError(error);
        }
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
