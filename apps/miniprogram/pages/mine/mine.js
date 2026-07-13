"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
Page({
    data: {
        user: null,
        teams: [],
        isDev: false,
        notice: "ALLINLE 是个人/团队德扑记账与非现金化牌技训练工具，不提供充值、提现、兑换、钱包、支付、抽水、房主分成、金币交易或积分兑换。"
    },
    onShow() {
        this.setData({ isDev: (0, request_1.isDevVersion)() });
        if ((0, request_1.getToken)()) {
            this.loadMe();
        }
    },
    async devLogin() {
        await (0, request_1.ensureDevLogin)();
        wx.showToast({ title: "已登录", icon: "success" });
        this.loadMe();
    },
    async switchDevUser() {
        await (0, request_1.switchDevLogin)();
        wx.showToast({ title: "已切换账号", icon: "success" });
        this.loadMe();
    },
    editNickname() {
        wx.navigateTo({ url: "/pages/profile-setup/profile-setup" });
    },
    async loadMe() {
        try {
            const [user, teams] = await Promise.all([
                request_1.api.get("/users/me"),
                request_1.api.get("/teams"),
            ]);
            this.setData({ user, teams });
        }
        catch {
            // Not logged in or token expired
            this.setData({ user: null, teams: [] });
        }
    }
});
