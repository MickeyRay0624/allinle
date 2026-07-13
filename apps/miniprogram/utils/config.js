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
    return "http://10.14.103.162:3000/api";
}
function getDefaultWsBase() {
    try {
        const sys = wx.getSystemInfoSync();
        if (sys.platform === "devtools") {
            return "http://127.0.0.1:3000";
        }
    }
    catch (_) { }
    return "http://10.14.103.162:3000";
}
exports.config = {
    apiBaseUrl: getDefaultApiBase(),
    wsBaseUrl: getDefaultWsBase()
};
