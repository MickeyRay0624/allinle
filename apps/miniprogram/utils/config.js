"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
function getDefaultApiBase() {
    return "https://api.poker.lmqstudio.com/api";
}
function getDefaultWsBase() {
    return "https://api.poker.lmqstudio.com/practice-room";
}
exports.config = {
    apiBaseUrl: getDefaultApiBase(),
    wsBaseUrl: getDefaultWsBase()
};
