import { api, ensureDevLogin } from "../../utils/request";

Page({
  data: {
    overview: null as any,
    ledger: null as any,
    practice: null as any,
    recent: [] as any[],
    trend: [] as any[],
    advice: [] as any[]
  },
  onShow() {
    this.loadStats();
  },
  async loadStats() {
    await ensureDevLogin();
    const [overview, ledger, practice, recent, trend, adviceResult] = await Promise.all([
      api.get("/stats/overview"),
      api.get("/stats/ledger"),
      api.get("/stats/practice/overview"),
      api.get<any[]>("/stats/practice/recent"),
      api.get<any[]>("/stats/practice/trend"),
      api.get<any>("/stats/practice/advice")
    ]);
    this.setData({
      overview,
      ledger,
      practice,
      recent,
      trend,
      advice: adviceResult.advice || []
    });
  },
  openReplay(event: any) {
    const handId = event.currentTarget.dataset.handId;
    if (handId) {
      wx.navigateTo({ url: `/pages/practice-replay/practice-replay?handId=${handId}` });
    }
  }
});
