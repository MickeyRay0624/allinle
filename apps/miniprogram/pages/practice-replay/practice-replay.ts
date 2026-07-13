import { api, ensureDevLogin } from "../../utils/request";

Page({
  data: {
    handId: "",
    roomCode: "",
    replay: null as any,
    loading: true
  },
  async onLoad(query: Record<string, string | undefined>) {
    this.setData({
      handId: query.handId || "",
      roomCode: query.roomCode || ""
    });
    await this.loadReplay();
  },
  async loadReplay() {
    try {
      await ensureDevLogin();
      const replay = this.data.handId
        ? await api.get<any>(`/practice/hands/${this.data.handId}/replay`)
        : await api.get<any>(`/practice/rooms/${this.data.roomCode}/latest-hand-replay`);
      this.setData({ replay, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error instanceof Error ? error.message : "复盘加载失败",
        icon: "none"
      });
    }
  },
  backToRoom() {
    if (!this.data.replay?.roomCode) {
      wx.navigateBack();
      return;
    }
    wx.navigateTo({ url: `/pages/practice-room/practice-room?roomCode=${this.data.replay.roomCode}` });
  }
});
