export interface AppStoreState {
  token: string;
  user: Record<string, unknown> | null;
}

const state: AppStoreState = {
  token: wx.getStorageSync("token") || "",
  user: wx.getStorageSync("user") || null
};

export const store = {
  getState() {
    return state;
  },
  setToken(token: string) {
    state.token = token;
    wx.setStorageSync("token", token);
  },
  setUser(user: Record<string, unknown>) {
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
