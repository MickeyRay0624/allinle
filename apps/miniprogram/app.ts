import { wechatLogin, devLogin, getToken, setToken, isDevVersion, api } from "./utils/request";

let checkingProfile = false;
let loginPromise: Promise<any> | null = null;

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
    if (getToken()) {
      this.refreshProfile();
    } else {
      this.doLogin();
    }
  },

  async doLogin() {
    if (loginPromise) return loginPromise;

    loginPromise = (async () => {
      try {
        let result: any;
        try {
          result = await wechatLogin();
        } catch (error) {
          if (!isDevVersion()) throw error;
          console.warn("微信登录失败，尝试本地开发登录...");
          result = await devLogin("测试用户");
        }

        if (result?.token) {
          setToken(result.token);
          this.globalData.token = result.token;
          if (result.user) {
            wx.setStorageSync("user", result.user);
            this.globalData.user = result.user;
          }
        }
        return result;
      } catch (error) {
        console.error("微信登录失败，请检查网络或 API 配置", error);
        return null;
      } finally {
        loginPromise = null;
      }
    })();

    return loginPromise;
  },

  reLogin() {
    return this.doLogin();
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
