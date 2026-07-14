import { api, ensureDevLogin } from "../../utils/request";

let timer: number | null = null;
let refreshInFlight = false;
let lastHandId = "";

function stopRoomPolling() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

Page({
  data: {
    mode: "", room: null as any, roomCodeInput: "", titleInput: "", tempNameInput: "",
    showCreateForm: false, showJoinForm: false, showTempPlayerForm: false,
    myWinEntry: "", myLossEntry: "", disputeNote: "", currentHand: null as any,
    isOwner: false, myParticipantId: "", summary: null as any, isBuyInPhase: false,
    allHaveBuyIn: false, myBuyIn: "", balance: null as any, settlements: [] as any[],
    myConfirmed: false, confirmationCount: 0, confirmationTotal: 0,
    showMyBalance: false, myBalance: 0, myBalanceBuyIn: 0, myBalanceNet: 0,
  },

  onLoad(options: any) {
    if (options.roomCode) this.setData({ mode: "room", roomCodeInput: options.roomCode });
  },
  onShow() {
    stopRoomPolling();
    this.loadData();
  },
  onHide() {
    stopRoomPolling();
  },
  onUnload() {
    stopRoomPolling();
    refreshInFlight = false;
    lastHandId = "";
  },

  startRoomPolling() {
    stopRoomPolling();
    timer = setInterval(() => this.refreshRoom(), 1500) as any;
  },
  async loadData() {
    await ensureDevLogin();
    if (this.data.mode === "room" && this.data.roomCodeInput) {
      await this.refreshRoom();
      this.startRoomPolling();
    }
  },
  async refreshRoom() {
    if (refreshInFlight || this.data.mode !== "room" || !this.data.roomCodeInput) return;
    refreshInFlight = true;
    try {
      const room = await api.get<any>(`/team-ledger/rooms/${this.data.roomCodeInput}`);
      const uid = (wx.getStorageSync("user") as any)?.id;
      const me = room.participants.find((participant: any) => participant.userId === uid);
      const currentHand = room.hands?.[room.hands.length - 1] || null;
      const handId = String(currentHand?.id || "");
      const handChanged = handId !== lastHandId;
      const activeParticipants = room.participants.filter((participant: any) => participant.status === "ACTIVE");
      const confirmedEntries = currentHand?.entries?.filter((entry: any) => entry.status === "CONFIRMED") || [];
      const submittedEntries = currentHand?.entries?.filter((entry: any) => entry.status === "SUBMITTED" || entry.status === "CONFIRMED") || [];
      const total = submittedEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
      const myEntry = currentHand?.entries?.find((entry: any) => entry.participantId === me?.id);
      const myBalanceBuyIn = Number(me?.buyInAmount || 0);
      const myBalanceNet = (room.hands || []).reduce((sum: number, hand: any) => {
        const entry = hand.entries?.find((item: any) => item.participantId === me?.id);
        const counts = hand.status === "LOCKED" || (hand.id === currentHand?.id && (entry?.status === "SUBMITTED" || entry?.status === "CONFIRMED"));
        return counts && entry ? sum + Number(entry.amount) : sum;
      }, 0);
      const isBuyInPhase = room.status === "ACTIVE" && room.currentHandNo === 0;
      const balance = currentHand ? {
        total,
        isBalanced: total === 0,
        allSubmitted: submittedEntries.length === activeParticipants.length,
        submittedCount: submittedEntries.length,
        totalCount: activeParticipants.length,
      } : null;
      const nextData: any = {
        room, currentHand, balance,
        isOwner: room.ownerUserId === uid,
        myParticipantId: me?.id || "",
        isBuyInPhase,
        allHaveBuyIn: activeParticipants.every((participant: any) => participant.buyInAmount !== null && participant.buyInAmount !== undefined),
        myConfirmed: myEntry?.status === "CONFIRMED",
        confirmationCount: confirmedEntries.length,
        confirmationTotal: activeParticipants.length,
        myBalanceBuyIn,
        myBalanceNet,
        myBalance: myBalanceBuyIn + myBalanceNet,
      };
      if (handChanged) {
        Object.assign(nextData, {
          myWinEntry: "", myLossEntry: "", disputeNote: "",
          showMyBalance: false, summary: null, settlements: [],
        });
        lastHandId = handId;
      }
      if (me?.buyInAmount !== null && me?.buyInAmount !== undefined) nextData.myBuyIn = String(me.buyInAmount);
      this.setData(nextData);
    } catch (error: any) {
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    } finally {
      refreshInFlight = false;
    }
  },

  toggleCreateForm() { this.setData({ showCreateForm: !this.data.showCreateForm, showJoinForm: false }); },
  toggleJoinForm() { this.setData({ showJoinForm: !this.data.showJoinForm, showCreateForm: false }); },
  toggleTempPlayerForm() { this.setData({ showTempPlayerForm: !this.data.showTempPlayerForm }); },
  onTitleInput(event: any) { this.setData({ titleInput: event.detail.value }); },
  onRoomCodeInput(event: any) { this.setData({ roomCodeInput: event.detail.value.toUpperCase() }); },
  onTempNameInput(event: any) { this.setData({ tempNameInput: event.detail.value }); },
  onWinInput(event: any) { this.setData({ myWinEntry: event.detail.value, myLossEntry: "" }); },
  onLossInput(event: any) { this.setData({ myLossEntry: event.detail.value, myWinEntry: "" }); },
  onDisputeNoteInput(event: any) { this.setData({ disputeNote: event.detail.value }); },
  onBuyInInput(event: any) { this.setData({ myBuyIn: event.detail.value }); },

  async doCreateRoom() { const room = await api.post<any>("/team-ledger/rooms", { title: this.data.titleInput }); this.setData({ mode: "room", roomCodeInput: room.roomCode, showCreateForm: false }); await this.refreshRoom(); this.startRoomPolling(); },
  async doJoinRoom() { await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/join`, {}); this.setData({ mode: "room", showJoinForm: false }); await this.refreshRoom(); this.startRoomPolling(); },
  async addTempPlayer() { await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/add-temp`, { displayName: this.data.tempNameInput }); this.setData({ tempNameInput: "", showTempPlayerForm: false }); await this.refreshRoom(); },
  async startRoom() { await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/start`, {}); await this.refreshRoom(); },
  async nextHand() {
    await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/next-hand`, {});
    await this.refreshRoom();
    wx.showToast({ title: "新一手已开始", icon: "success" });
  },
  async setBuyIn() { const amount = Number(this.data.myBuyIn); if (!this.data.myBuyIn || !Number.isFinite(amount) || amount < 0) { wx.showToast({ title: "请输入有效的带入金额", icon: "none" }); return; } await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/buy-in`, { buyInAmount: amount }); wx.showToast({ title: "带入筹码已确认", icon: "success" }); await this.refreshRoom(); },
  async submitEntry() { const hand = this.data.currentHand as any; if (!hand) return; const amount = this.data.myWinEntry ? Number(this.data.myWinEntry) : -Number(this.data.myLossEntry); await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${hand.handNo}/entry`, { amount }); this.setData({ myWinEntry: "", myLossEntry: "" }); await this.refreshRoom(); await this.checkBalance(); },
  async checkBalance() { const hand = this.data.currentHand as any; if (!hand) return; try { const balance = await api.get<any>(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${hand.handNo}/balance`); this.setData({ balance, showMyBalance: true }); wx.showToast({ title: "余额已更新", icon: "success" }); } catch (error: any) { wx.showToast({ title: error.message || "余额查询失败", icon: "none" }); } },
  async requestConfirmation() { const hand = this.data.currentHand as any; if (!this.data.balance?.allSubmitted) { wx.showToast({ title: "还有参与者未提交金额", icon: "none" }); return; } if (!this.data.balance?.isBalanced) { wx.showToast({ title: "账目尚未平衡", icon: "none" }); return; } try { await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${hand.handNo}/request-confirm`, {}); wx.showToast({ title: "已请求全员确认", icon: "success" }); await this.refreshRoom(); } catch (error: any) { wx.showToast({ title: error.message || "请求确认失败", icon: "none" }); } },
  async confirmHand() { const hand = this.data.currentHand as any; if (this.data.myConfirmed) { wx.showToast({ title: "你已确认本手", icon: "none" }); return; } await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${hand.handNo}/confirm`, {}); this.setData({ myConfirmed: true, confirmationCount: Math.min(this.data.confirmationCount + 1, this.data.confirmationTotal) }); wx.showToast({ title: "本手已确认", icon: "success" }); await this.refreshRoom(); },
  async disputeHand() { const hand = this.data.currentHand as any; await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${hand.handNo}/dispute`, { note: this.data.disputeNote }); this.setData({ balance: { total: 0, isBalanced: true, allSubmitted: false, submittedCount: 0, totalCount: this.data.confirmationTotal } }); await this.refreshRoom(); },
  async loadSummary() { this.setData({ summary: await api.get(`/team-ledger/rooms/${this.data.roomCodeInput}/summary`) }); },
  async loadSettlement() { try { const settlements = await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/settlement`, {}) as any[]; this.setData({ settlements }); wx.showToast({ title: settlements.length ? `已生成 ${settlements.length} 条结算建议` : "当前无需互相结算", icon: "none" }); } catch (error: any) { wx.showToast({ title: error.message || "生成结算失败", icon: "none" }); } },
  async endRoom() { await api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/end`, {}); await this.refreshRoom(); await this.loadSummary(); },
  leaveRoom() { stopRoomPolling(); lastHandId = ""; this.setData({ mode: "", room: null, currentHand: null, summary: null }); },
});
