"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
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
        wx.navigateTo({ url: `/pages/practice-room/practice-room?roomCode=${this.data.replay.roomCode}` });
    }
});
