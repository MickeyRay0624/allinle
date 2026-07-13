import { api } from "../../utils/request";

Page({
  data: {
    nickname: "",
    saving: false,
  },

  onLoad() {
    const user = wx.getStorageSync("user") || {};
    const nickname = user.nickname === "微信用户" ? "" : (user.nickname || "");
    this.setData({ nickname });
  },

  onNicknameInput(event: any) {
    this.setData({ nickname: event.detail.value });
  },

  async saveNickname() {
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2) {
      wx.showToast({ title: "昵称至少需要2个字符", icon: "none" });
      return;
    }
    if (nickname.length > 20) {
      wx.showToast({ title: "昵称不能超过20个字符", icon: "none" });
      return;
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const user = await api.patch<any>("/users/me", { nickname });
      wx.setStorageSync("user", user);
      const app = getApp();
      app.globalData.user = user;
      wx.showToast({ title: "昵称设置成功", icon: "success" });
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) wx.navigateBack();
        else wx.reLaunch({ url: "/pages/index/index" });
      }, 500);
    } catch (error: any) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
