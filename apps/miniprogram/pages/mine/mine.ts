import { api, ensureDevLogin, switchDevLogin, isDevVersion, getToken } from "../../utils/request";

Page({
  data: {
    user: null as any,
    teams: [] as any[],
    isDev: false as boolean,
    notice:
      "ALLINLE 是个人/团队德扑记账与非现金化牌技训练工具，不提供充值、提现、兑换、钱包、支付、抽水、房主分成、金币交易或积分兑换。"
  },
  onShow() {
    this.setData({ isDev: isDevVersion() });
    if (getToken()) {
      this.loadMe();
    }
  },
  async devLogin() {
    await ensureDevLogin();
    wx.showToast({ title: "已登录", icon: "success" });
    this.loadMe();
  },
  async switchDevUser() {
    await switchDevLogin();
    wx.showToast({ title: "已切换账号", icon: "success" });
    this.loadMe();
  },
  editNickname() {
    wx.navigateTo({ url: "/pages/profile-setup/profile-setup" });
  },
  async loadMe() {
    try {
      const [user, teams] = await Promise.all([
        api.get("/users/me"),
        api.get("/teams"),
      ]);
      this.setData({ user, teams });
    } catch {
      // Not logged in or token expired
      this.setData({ user: null, teams: [] });
    }
  }
});
