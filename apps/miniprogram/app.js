"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./utils/request");
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
    async doLogin() {
        try {
            await (0, request_1.wechatLogin)();
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
});
