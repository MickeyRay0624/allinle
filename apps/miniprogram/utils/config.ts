function getDefaultApiBase(): string {
  try {
    const sys = wx.getSystemInfoSync();
    if (sys.platform === "devtools") {
      return "http://127.0.0.1:3000/api";
    }
  } catch (_) {}
  return "http://10.14.103.162:3000/api";
}

function getDefaultWsBase(): string {
  try {
    const sys = wx.getSystemInfoSync();
    if (sys.platform === "devtools") {
      return "http://127.0.0.1:3000";
    }
  } catch (_) {}
  return "http://10.14.103.162:3000";
}

export const config = {
  apiBaseUrl: getDefaultApiBase(),
  wsBaseUrl: getDefaultWsBase()
};
