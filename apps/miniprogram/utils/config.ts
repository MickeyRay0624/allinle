function getDefaultApiBase(): string {
  try {
    const sys = wx.getSystemInfoSync();
    if (sys.platform === "devtools") {
      return "http://127.0.0.1:3000/api";
    }
  } catch (_) {}
  return "https://api.poker.lmqstudio.com/api";
}

function getDefaultWsBase(): string {
  try {
    const sys = wx.getSystemInfoSync();
    if (sys.platform === "devtools") {
      return "http://127.0.0.1:3000/practice-room";
    }
  } catch (_) {}
  return "https://api.poker.lmqstudio.com/practice-room";
}

export const config = {
  apiBaseUrl: getDefaultApiBase(),
  wsBaseUrl: getDefaultWsBase()
};
