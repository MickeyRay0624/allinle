"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
Page({
    data: {
        botCount: 1,
        botLevel: "BEGINNER",
        initialPracticeChips: 10000,
        smallBlind: 50,
        bigBlind: 100,
        creating: false,
        botCounts: [
            { value: 1, label: "单挑" },
            { value: 2, label: "三人" },
            { value: 5, label: "六人" },
            { value: 8, label: "九人" }
        ],
        levels: [
            { value: "BEGINNER", label: "入门" },
            { value: "NORMAL", label: "普通" },
            { value: "ADVANCED", label: "进阶" }
        ],
        chipOptions: [1000, 2000, 5000, 10000],
        blindOptions: [
            { smallBlind: 5, bigBlind: 10, label: "5 / 10" },
            { smallBlind: 10, bigBlind: 20, label: "10 / 20" },
            { smallBlind: 50, bigBlind: 100, label: "50 / 100" },
            { smallBlind: 100, bigBlind: 200, label: "100 / 200" }
        ]
    },
    selectBotCount(event) {
        this.setData({ botCount: Number(event.currentTarget.dataset.value) });
    },
    selectLevel(event) {
        this.setData({ botLevel: event.currentTarget.dataset.value });
    },
    selectChips(event) {
        this.setData({ initialPracticeChips: Number(event.currentTarget.dataset.value) });
    },
    selectBlinds(event) {
        this.setData({
            smallBlind: Number(event.currentTarget.dataset.small),
            bigBlind: Number(event.currentTarget.dataset.big)
        });
    },
    async createSolo() {
        if (this.data.creating)
            return;
        try {
            this.setData({ creating: true });
            await (0, request_1.ensureDevLogin)();
            const gameView = await request_1.api.post("/practice/solo/create", {
                botCount: this.data.botCount,
                botLevel: this.data.botLevel,
                initialPracticeChips: this.data.initialPracticeChips,
                smallBlind: this.data.smallBlind,
                bigBlind: this.data.bigBlind
            });
            const roomCode = gameView.roomState?.roomCode;
            if (!roomCode) {
                throw new Error("单人练习房创建成功，但未返回房间码");
            }
            wx.redirectTo({ url: `/pages/practice/friend-table/index?roomCode=${roomCode}` });
        }
        catch (error) {
            wx.showToast({
                title: error instanceof Error ? error.message : "创建失败",
                icon: "none"
            });
        }
        finally {
            this.setData({ creating: false });
        }
    }
});
