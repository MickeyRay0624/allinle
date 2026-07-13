import { api, ensureDevLogin } from "../../utils/request";

Page({
  data: {
    title: "个人牌局",
    blindLevel: "1/2",
    buyIn: "1000",
    cashOut: "0",
    durationMinutes: "180",
    note: "",
    profit: -1000,
    games: [] as any[]
  },
  onShow() {
    this.loadGames();
  },
  onInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field;
    if (typeof field !== "string") return;
    this.setData({ [field]: event.detail.value }, () => this.recalculate());
  },
  recalculate() {
    const buyIn = Number(this.data.buyIn || 0);
    const cashOut = Number(this.data.cashOut || 0);
    this.setData({ profit: cashOut - buyIn });
  },
  async saveGame() {
    await ensureDevLogin();
    await api.post("/ledger/games", {
      type: "PERSONAL",
      title: this.data.title,
      blindLevel: this.data.blindLevel,
      gameDate: new Date().toISOString(),
      durationMinutes: Number(this.data.durationMinutes || 0),
      note: this.data.note,
      initialBuyIn: Number(this.data.buyIn || 0),
      initialCashOut: Number(this.data.cashOut || 0)
    });
    wx.showToast({ title: "已保存", icon: "success" });
    this.loadGames();
  },
  async loadGames() {
    try {
      await ensureDevLogin();
      const games = await api.get<any[]>("/ledger/games");
      this.setData({ games: games.filter((game) => game.type === "PERSONAL") });
    } catch (error) {
      console.warn(error);
    }
  }
});
