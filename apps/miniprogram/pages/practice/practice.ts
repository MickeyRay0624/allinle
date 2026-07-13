import { api, ensureDevLogin } from "../../utils/request";

Page({
  data: {
    notice: "本功能仅用于德州扑克规则学习与牌技交流。房间内所有筹码均为模拟练习筹码，不具备任何财产属性，不支持充值、提现、转让或兑换。",
    playerCount: "6",
    smallBlind: "50",
    bigBlind: "100",
    initialPracticeChips: "10000",
    roomCode: "",
    botLevel: "BEGINNER"
  },

  onInput(event: any) {
    const field = event.currentTarget.dataset.field;
    if (typeof field === "string") {
      this.setData({ [field]: event.detail.value });
    }
  },

  async createFriendsRoom() {
    try {
      await ensureDevLogin();
      const room = await api.post<any>("/practice/rooms", {
        playerCount: Number(this.data.playerCount),
        smallBlind: Number(this.data.smallBlind),
        bigBlind: Number(this.data.bigBlind),
        initialPracticeChips: Number(this.data.initialPracticeChips)
      });
      wx.navigateTo({ url: `/pages/practice/friend-room/index?roomCode=${room.roomCode}` });
    } catch (error) {
      this.showError(error);
    }
  },

  async joinFriendsRoom() {
    try {
      await ensureDevLogin();
      const roomCode = this.data.roomCode.trim().toUpperCase();
      if (!roomCode) {
        wx.showToast({ title: "请输入房间码", icon: "none" });
        return;
      }
      await api.post(`/practice/rooms/${roomCode}/join`, {});
      wx.navigateTo({ url: `/pages/practice/friend-room/index?roomCode=${roomCode}` });
    } catch (error) {
      this.showError(error);
    }
  },

  openSolo() {
    wx.navigateTo({ url: "/pages/practice-solo/practice-solo" });
  },

  showError(error: unknown) {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败",
      icon: "none"
    });
  }
});
