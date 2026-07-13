"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const state = {
    token: wx.getStorageSync("token") || "",
    user: wx.getStorageSync("user") || null
};
exports.store = {
    getState() {
        return state;
    },
    setToken(token) {
        state.token = token;
        wx.setStorageSync("token", token);
    },
    setUser(user) {
        state.user = user;
        wx.setStorageSync("user", user);
    },
    clear() {
        state.token = "";
        state.user = null;
        wx.removeStorageSync("token");
        wx.removeStorageSync("user");
    }
};
