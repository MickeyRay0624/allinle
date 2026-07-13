"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
let replayPollTimer = null;
Page({
    data: {
        handId: "",
        roomCode: "",
        replay: null,
        loading: true
    },
    async onLoad(query) {
        this.setData({
            handId: query.handId || "",
            roomCode: query.roomCode || ""
        });
        await this.loadReplay();
        this.startRoomPolling();
    },
    onUnload() {
        if (replayPollTimer !== null)
            clearInterval(replayPollTimer);
        replayPollTimer = null;
    },
    startRoomPolling() {
        if (replayPollTimer !== null)
            clearInterval(replayPollTimer);
        replayPollTimer = setInterval(async () => {
            const roomCode = this.data.replay?.roomCode || this.data.roomCode;
            if (!roomCode || !this.data.replay)
                return;
            try {
                const gameView = await request_1.api.get(`/practice/rooms/${roomCode}/game-state`);
                const currentHandNo = Number(gameView?.publicState?.handNo || 0);
                if (gameView?.publicState?.status === "PLAYING" && currentHandNo > Number(this.data.replay.handNo || 0)) {
                    wx.redirectTo({ url: `/pages/practice/friend-table/index?roomCode=${roomCode}` });
                }
            }
            catch (_) { }
        }, 2000);
    },
    async loadReplay() {
        try {
            await (0, request_1.ensureDevLogin)();
            const replay = this.data.handId
                ? await request_1.api.get(`/practice/hands/${this.data.handId}/replay`)
                : await request_1.api.get(`/practice/rooms/${this.data.roomCode}/latest-hand-replay`);
            this.setData({ replay, loading: false });
        }
        catch (error) {
            this.setData({ loading: false });
            wx.showToast({
                title: error instanceof Error ? error.message : "复盘加载失败",
                icon: "none"
            });
        }
    },
    backToRoom() {
        if (!this.data.replay?.roomCode) {
            wx.navigateBack();
            return;
        }
        wx.redirectTo({ url: `/pages/practice/friend-table/index?roomCode=${this.data.replay.roomCode}` });
    }
});
