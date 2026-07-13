"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./utils/request");
let checkingNickname = false;
App({
    globalData: {
        token: "",
        user: null,
    },
    onLaunch() {
        const token = (0, request_1.getToken)();
        if (token) {
            this.globalData.token = token;
            return;
        }
        this.doLogin();
    },
    onShow() {
        wx.showShareMenu({ menus: ["shareAppMessage", "shareTimeline"] });
        if ((0, request_1.getToken)())
            this.checkNickname();
    },
    async doLogin() {
        try {
            await (0, request_1.wechatLogin)();
            await this.checkNickname();
        }
        catch (error) {
            if (!(0, request_1.isDevVersion)()) {
                console.error("微信登录失败", error);
                return;
            }
            console.warn("微信登录失败，尝试本地开发登录...");
            try {
                const result = await (0, request_1.devLogin)("测试用户");
                if (result?.token) {
                    (0, request_1.setToken)(result.token);
                    this.globalData.token = result.token;
                    if (result.user) {
                        wx.setStorageSync("user", result.user);
                        this.globalData.user = result.user;
                    }
                }
            }
            catch {
                console.error("登录失败，请检查网络或 API 地址");
            }
        }
    },
    reLogin() {
        this.doLogin();
    },
    async checkNickname() {
        if (checkingNickname || !(0, request_1.getToken)())
            return;
        checkingNickname = true;
        try {
            const user = await request_1.api.get("/users/me");
            wx.setStorageSync("user", user);
            this.globalData.user = user;
            const nickname = String(user?.nickname || "").trim();
            const needsSetup = !nickname || nickname === "微信用户" || nickname === "测试用户";
            const pages = getCurrentPages();
            const currentRoute = pages[pages.length - 1]?.route || "";
            if (needsSetup && currentRoute !== "pages/profile-setup/profile-setup") {
                setTimeout(() => wx.navigateTo({ url: "/pages/profile-setup/profile-setup" }), 200);
            }
        }
        catch (error) {
            console.error("检查昵称失败", error);
        }
        finally {
            checkingNickname = false;
        }
    },
});
