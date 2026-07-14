import { wechatLogin, devLogin, getToken, setToken, isDevVersion, api } from "./utils/request";

let checkingProfile = false;

App({
  globalData: {
    token: "",
    user: null,
  },

  onLaunch() {
    const token = getToken();
    if (token) {
      this.globalData.token = token;
      return;
    }
    this.doLogin();
  },

  onShow() {
    wx.showShareMenu({ menus: ["shareAppMessage", "shareTimeline"] });
    if (getToken()) this.refreshProfile();
  },

  async doLogin() {
    try {
      await wechatLogin();
      await this.refreshProfile();
    } catch (error) {
      if (!isDevVersion()) {
        console.error("微信登录失败", error);
        return;
      }
      console.warn("微信登录失败，尝试本地开发登录...");
      try {
        const result = await devLogin("测试用户");
        if (result?.token) {
          setToken(result.token);
          this.globalData.token = result.token;
          if (result.user) {
            wx.setStorageSync("user", result.user);
            this.globalData.user = result.user;
          }
        }
      } catch {
        console.error("登录失败，请检查网络或 API 地址");
      }
    }
  },

  reLogin() {
    this.doLogin();
  },

  async refreshProfile() {
    if (checkingProfile || !getToken()) return;
    checkingProfile = true;
    try {
      const user = await api.get<any>("/users/me");
      wx.setStorageSync("user", user);
      this.globalData.user = user;
    } catch (error) {
      console.error("刷新用户资料失败", error);
    } finally {
      checkingProfile = false;
    }
  },
});
