"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
Page({
    data: {
        nickname: "",
        saving: false,
        avatarUrl: "",
        wechatId: "",
        presetAvatars: [1, 2, 3, 4].map((n) => `https://api.poker.lmqstudio.com/assets/avatars/avatar-${n}.svg`),
    },
    onLoad() {
        const user = wx.getStorageSync("user") || {};
        const nickname = user.nickname === "微信用户" ? "" : (user.nickname || "");
        const openid = String(user.openid || "");
        this.setData({ nickname, avatarUrl: user.avatarUrl || "", wechatId: openid ? `${openid.slice(0, 6)}…${openid.slice(-4)}` : "已通过微信认证" });
    },
    async onChooseAvatar(event) {
        await this.uploadSelectedAvatar(event.detail.avatarUrl);
    },
    chooseCustomAvatar() {
        wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album", "camera"], success: (result) => this.uploadSelectedAvatar(result.tempFiles[0].tempFilePath) });
    },
    async uploadSelectedAvatar(filePath) {
        try {
            wx.showLoading({ title: "上传头像" });
            const user = await (0, request_1.uploadAvatar)(filePath);
            this.setData({ avatarUrl: user.avatarUrl });
            wx.setStorageSync("user", user);
        }
        catch (error) {
            wx.showToast({ title: error.message || "上传失败", icon: "none" });
        }
        finally {
            wx.hideLoading();
        }
    },
    selectPreset(event) {
        this.setData({ avatarUrl: event.currentTarget.dataset.url });
    },
    skipSetup() {
        const pages = getCurrentPages();
        if (pages.length > 1)
            wx.navigateBack();
        else
            wx.reLaunch({ url: "/pages/index/index" });
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
            wx.showToast({ title: "资料保存成功", icon: "success" });
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
