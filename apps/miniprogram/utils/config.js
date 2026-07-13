"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
function getDefaultApiBase() {
    try {
        const sys = wx.getSystemInfoSync();
        if (sys.platform === "devtools") {
            return "http://127.0.0.1:3000/api";
        }
    }
    catch (_) { }
    return "https://api.poker.lmqstudio.com/api";
}
function getDefaultWsBase() {
    try {
        const sys = wx.getSystemInfoSync();
        if (sys.platform === "devtools") {
            return "http://127.0.0.1:3000/practice-room";
        }
    }
    catch (_) { }
    return "https://api.poker.lmqstudio.com/practice-room";
}
exports.config = {
    apiBaseUrl: getDefaultApiBase(),
    wsBaseUrl: getDefaultWsBase()
};
