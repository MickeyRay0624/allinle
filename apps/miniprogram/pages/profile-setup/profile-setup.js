"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
Page({
    data: {
        nickname: "",
        saving: false,
        avatarUrl: "",
        wechatId: "",
    },
    onLoad() {
        const user = wx.getStorageSync("user") || {};
        const nickname = user.nickname === "微信用户" ? "" : (user.nickname || "");
        const openid = String(user.openid || "");
        this.setData({ nickname, avatarUrl: user.avatarUrl || "", wechatId: openid ? `${openid.slice(0, 6)}…${openid.slice(-4)}` : "已通过微信认证" });
    },
    useWechatProfile() {
        wx.getUserProfile({
            desc: "用于好友练习房展示昵称和头像",
            success: (result) => this.setData({ nickname: result.userInfo?.nickName || this.data.nickname, avatarUrl: result.userInfo?.avatarUrl || "" }),
            fail: () => wx.showToast({ title: "你可以继续使用自定义昵称", icon: "none" })
        });
    },
    onNicknameInput(event) {
        this.setData({ nickname: event.detail.value });
    },
    async saveNickname() {
        const nickname = this.data.nickname.trim();
        if (nickname.length < 2) {
            wx.showToast({ title: "昵称至少需要2个字符", icon: "none" });
            return;
        }
        if (nickname.length > 20) {
            wx.showToast({ title: "昵称不能超过20个字符", icon: "none" });
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            const user = await request_1.api.patch("/users/me", { nickname, avatarUrl: this.data.avatarUrl || undefined });
            wx.setStorageSync("user", user);
            const app = getApp();
            app.globalData.user = user;
            wx.showToast({ title: "昵称设置成功", icon: "success" });
            setTimeout(() => {
                const pages = getCurrentPages();
                if (pages.length > 1)
                    wx.navigateBack();
                else
                    wx.reLaunch({ url: "/pages/index/index" });
            }, 500);
        }
        catch (error) {
            wx.showToast({ title: error.message || "保存失败", icon: "none" });
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
