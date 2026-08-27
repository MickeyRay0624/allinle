"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("./utils/request");
let checkingProfile = false;
let loginPromise = null;
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
        if ((0, request_1.getToken)()) {
            this.refreshProfile();
        }
        else {
            this.doLogin();
        }
    },
    async doLogin() {
        if (loginPromise)
            return loginPromise;
        loginPromise = (async () => {
            try {
                let result;
                try {
                    result = await (0, request_1.wechatLogin)();
                }
                catch (error) {
                    if (!(0, request_1.isDevVersion)())
                        throw error;
                    console.warn("微信登录失败，尝试本地开发登录...");
                    result = await (0, request_1.devLogin)("测试用户");
                }
                if (result?.token) {
                    (0, request_1.setToken)(result.token);
                    this.globalData.token = result.token;
                    if (result.user) {
                        wx.setStorageSync("user", result.user);
                        this.globalData.user = result.user;
                    }
                }
                return result;
            }
            catch (error) {
                console.error("微信登录失败，请检查网络或 API 配置", error);
                return null;
            }
            finally {
                loginPromise = null;
            }
        })();
        return loginPromise;
    },
    reLogin() {
        return this.doLogin();
    },
    async refreshProfile() {
        if (checkingProfile || !(0, request_1.getToken)())
            return;
        checkingProfile = true;
        try {
            const user = await request_1.api.get("/users/me");
            wx.setStorageSync("user", user);
            this.globalData.user = user;
        }
        catch (error) {
            console.error("刷新用户资料失败", error);
        }
        finally {
            checkingProfile = false;
        }
    },
});
