"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
exports.getToken = getToken;
exports.setToken = setToken;
exports.request = request;
exports.wechatLogin = wechatLogin;
exports.devLogin = devLogin;
exports.ensureDevLogin = ensureDevLogin;
exports.switchDevLogin = switchDevLogin;
exports.isDevVersion = isDevVersion;
const API_BASE = "http://10.14.103.162:3000/api"; // Production URL
function getToken() {
    try {
        return wx.getStorageSync("token") || null;
    }
    catch {
        return null;
    }
}
function setToken(token) {
    wx.setStorageSync("token", token);
}
function clearToken() {
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
}
async function request(options) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.header,
    };
    if (token && options.needAuth !== false) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${API_BASE}${options.url}`,
            method: (options.method || "GET"),
            data: options.data,
            header: headers,
            success: (res) => {
                const body = res.data;
                // Token expired or unauthorized
                if (res.statusCode === 401 && body?.code === "AUTH_UNAUTHORIZED") {
                    clearToken();
                    // Trigger re-login
                    const app = getApp();
                    if (app.reLogin) {
                        app.reLogin();
                    }
                    reject(new Error("登录已过期"));
                    return;
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body.data !== undefined ? body.data : body);
                }
                else {
                    reject(new Error(body?.message || "请求失败"));
                }
            },
            fail: (err) => {
                reject(new Error(err.errMsg || "网络错误"));
            },
        });
    });
}
// WeChat login helper
async function wechatLogin(userInfo) {
    return new Promise((resolve, reject) => {
        wx.login({
            success: async (loginRes) => {
                try {
                    const result = await request({
                        url: "/auth/wx-login",
                        method: "POST",
                        data: {
                            code: loginRes.code,
                            ...userInfo,
                        },
                        needAuth: false,
                    });
                    if (result?.token) {
                        setToken(result.token);
                        if (result.user) {
                            wx.setStorageSync("user", result.user);
                        }
                    }
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
            },
            fail: (err) => {
                reject(new Error(err.errMsg || "wx.login 失败"));
            },
        });
    });
}
// Dev login helper - only in development
async function devLogin(nickname) {
    return request({
        url: "/auth/dev-login",
        method: "POST",
        data: {
            openid: `dev_${Date.now()}`,
            nickname: nickname || "测试用户",
        },
        needAuth: false,
    });
}
// Ensure dev login - auto login as random test user
async function ensureDevLogin() {
    const token = getToken();
    if (token)
        return token;
    const result = await devLogin();
    if (result?.token) {
        setToken(result.token);
        if (result.user)
            wx.setStorageSync("user", result.user);
        return result.token;
    }
    throw new Error("开发登录失败");
}
// Switch dev user - login as a different test user
const TEST_USERS = [
    "测试用户1", "测试用户2", "测试用户3",
    "ALLINLE玩家A", "ALLINLE玩家B",
];
let testUserIndex = 0;
async function switchDevLogin() {
    testUserIndex = (testUserIndex + 1) % TEST_USERS.length;
    const nickname = TEST_USERS[testUserIndex];
    const result = await devLogin(nickname);
    if (result?.token) {
        setToken(result.token);
        if (result.user)
            wx.setStorageSync("user", result.user);
        return result.token;
    }
    throw new Error("切换账号失败");
}
// API helper for simpler calls
exports.api = {
    get: (url) => request({ url }),
    post: (url, data) => request({ url, method: "POST", data }),
};
// Check if running in WeChat dev tools (development mode)
function isDevVersion() {
    try {
        const info = wx.getAccountInfoSync();
        return info.miniProgram.envVersion !== "release";
    }
    catch {
        return false;
    }
}
