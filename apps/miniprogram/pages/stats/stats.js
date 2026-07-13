"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
Page({
    data: {
        overview: null,
        ledger: null,
        practice: null,
        recent: [],
        trend: [],
        advice: []
    },
    onShow() {
        this.loadStats();
    },
    async loadStats() {
        await (0, request_1.ensureDevLogin)();
        const [overview, ledger, practice, recent, trend, adviceResult] = await Promise.all([
            request_1.api.get("/stats/overview"),
            request_1.api.get("/stats/ledger"),
            request_1.api.get("/stats/practice/overview"),
            request_1.api.get("/stats/practice/recent"),
            request_1.api.get("/stats/practice/trend"),
            request_1.api.get("/stats/practice/advice")
        ]);
        this.setData({
            overview,
            ledger,
            practice,
            recent,
            trend,
            advice: adviceResult.advice || []
        });
    },
    openReplay(event) {
        const handId = event.currentTarget.dataset.handId;
        if (handId) {
            wx.navigateTo({ url: `/pages/practice-replay/practice-replay?handId=${handId}` });
        }
    }
});
