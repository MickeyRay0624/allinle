"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("../../utils/request");
let timer = null;
Page({ data: { mode: "", room: null, roomCodeInput: "", titleInput: "", tempNameInput: "", showCreateForm: false, showJoinForm: false, showTempPlayerForm: false, myWinEntry: "", myLossEntry: "", disputeNote: "", currentHand: null, isOwner: false, myParticipantId: "", summary: null, isBuyInPhase: false, allHaveBuyIn: false, myBuyIn: "", balance: null, settlements: [], myConfirmed: false, confirmationCount: 0, confirmationTotal: 0, showMyBalance: false, myBalance: 0, myBalanceBuyIn: 0, myBalanceNet: 0 },
    onLoad(o) { if (o.roomCode)
        this.setData({ mode: "room", roomCodeInput: o.roomCode }); }, onShow() { this.loadData(); }, onUnload() { if (timer)
        clearInterval(timer); },
    async loadData() { await (0, request_1.ensureDevLogin)(); if (this.data.mode === "room" && this.data.roomCodeInput)
        await this.refreshRoom(); },
    async refreshRoom() { try {
        const room = await request_1.api.get(`/team-ledger/rooms/${this.data.roomCodeInput}`);
        const uid = wx.getStorageSync("user")?.id;
        const me = room.participants.find((p) => p.userId === uid);
        const currentHand = room.hands?.[room.hands.length - 1] || null;
        const activeParticipants = room.participants.filter((p) => p.status === "ACTIVE");
        const confirmedEntries = currentHand?.entries?.filter((entry) => entry.status === "CONFIRMED") || [];
        const submittedEntries = currentHand?.entries?.filter((entry) => entry.status === "SUBMITTED" || entry.status === "CONFIRMED") || [];
        const total = submittedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
        const myEntry = currentHand?.entries?.find((entry) => entry.participantId === me?.id);
        const myBalanceBuyIn = Number(me?.buyInAmount || 0);
        const myBalanceNet = (room.hands || []).reduce((sum, hand) => { const entry = hand.entries?.find((item) => item.participantId === me?.id); const counts = hand.status === "LOCKED" || (hand.id === currentHand?.id && (entry?.status === "SUBMITTED" || entry?.status === "CONFIRMED")); return counts && entry ? sum + Number(entry.amount) : sum; }, 0);
        const isBuyInPhase = room.status === "ACTIVE" && room.currentHandNo === 0;
        const balance = currentHand ? { total, isBalanced: total === 0, allSubmitted: submittedEntries.length === activeParticipants.length, submittedCount: submittedEntries.length, totalCount: activeParticipants.length } : null;
        const nextData = { room, currentHand, balance, isOwner: room.ownerUserId === uid, myParticipantId: me?.id || "", isBuyInPhase, allHaveBuyIn: activeParticipants.every((p) => p.buyInAmount !== null && p.buyInAmount !== undefined), myConfirmed: myEntry?.status === "CONFIRMED", confirmationCount: confirmedEntries.length, confirmationTotal: activeParticipants.length, myBalanceBuyIn, myBalanceNet, myBalance: myBalanceBuyIn + myBalanceNet };
        if (me?.buyInAmount !== null && me?.buyInAmount !== undefined)
            nextData.myBuyIn = String(me.buyInAmount);
        this.setData(nextData);
        if (!timer)
            timer = setInterval(() => this.refreshRoom(), 2500);
    }
    catch (e) {
        wx.showToast({ title: e.message || "加载失败", icon: "none" });
    } },
    toggleCreateForm() { this.setData({ showCreateForm: !this.data.showCreateForm, showJoinForm: false }); }, toggleJoinForm() { this.setData({ showJoinForm: !this.data.showJoinForm, showCreateForm: false }); }, toggleTempPlayerForm() { this.setData({ showTempPlayerForm: !this.data.showTempPlayerForm }); },
    onTitleInput(e) { this.setData({ titleInput: e.detail.value }); }, onRoomCodeInput(e) { this.setData({ roomCodeInput: e.detail.value.toUpperCase() }); }, onTempNameInput(e) { this.setData({ tempNameInput: e.detail.value }); }, onWinInput(e) { this.setData({ myWinEntry: e.detail.value, myLossEntry: "" }); }, onLossInput(e) { this.setData({ myLossEntry: e.detail.value, myWinEntry: "" }); }, onDisputeNoteInput(e) { this.setData({ disputeNote: e.detail.value }); }, onBuyInInput(e) { this.setData({ myBuyIn: e.detail.value }); },
    async doCreateRoom() { const r = await request_1.api.post("/team-ledger/rooms", { title: this.data.titleInput }); this.setData({ mode: "room", roomCodeInput: r.roomCode, showCreateForm: false }); await this.refreshRoom(); },
    async doJoinRoom() { await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/join`, {}); this.setData({ mode: "room", showJoinForm: false }); await this.refreshRoom(); },
    async addTempPlayer() { await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/add-temp`, { displayName: this.data.tempNameInput }); this.setData({ tempNameInput: "", showTempPlayerForm: false }); await this.refreshRoom(); },
    async startRoom() { await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/start`, {}); await this.refreshRoom(); }, async nextHand() { await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/next-hand`, {}); await this.refreshRoom(); }, async setBuyIn() { const amount = Number(this.data.myBuyIn); if (!this.data.myBuyIn || !Number.isFinite(amount) || amount < 0) {
        wx.showToast({ title: "请输入有效的带入金额", icon: "none" });
        return;
    } await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/buy-in`, { buyInAmount: amount }); wx.showToast({ title: "带入筹码已确认", icon: "success" }); await this.refreshRoom(); },
    async submitEntry() { const h = this.data.currentHand; if (!h)
        return; const n = this.data.myWinEntry ? Number(this.data.myWinEntry) : -Number(this.data.myLossEntry); await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${h.handNo}/entry`, { amount: n }); this.setData({ myWinEntry: "", myLossEntry: "" }); await this.refreshRoom(); await this.checkBalance(); },
    async checkBalance() { const h = this.data.currentHand; if (!h)
        return; try {
        const balance = await request_1.api.get(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${h.handNo}/balance`);
        this.setData({ balance, showMyBalance: true });
        wx.showToast({ title: "余额已更新", icon: "success" });
    }
    catch (e) {
        wx.showToast({ title: e.message || "余额查询失败", icon: "none" });
    } }, async requestConfirmation() { const h = this.data.currentHand; if (!this.data.balance?.allSubmitted) {
        wx.showToast({ title: "还有参与者未提交金额", icon: "none" });
        return;
    } if (!this.data.balance?.isBalanced) {
        wx.showToast({ title: "账目尚未平衡", icon: "none" });
        return;
    } try {
        await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${h.handNo}/request-confirm`, {});
        wx.showToast({ title: "已请求全员确认", icon: "success" });
        await this.refreshRoom();
    }
    catch (e) {
        wx.showToast({ title: e.message || "请求确认失败", icon: "none" });
    } }, async confirmHand() { const h = this.data.currentHand; if (this.data.myConfirmed) {
        wx.showToast({ title: "你已确认本手", icon: "none" });
        return;
    } await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${h.handNo}/confirm`, {}); this.setData({ myConfirmed: true, confirmationCount: Math.min(this.data.confirmationCount + 1, this.data.confirmationTotal) }); wx.showToast({ title: "本手已确认", icon: "success" }); await this.refreshRoom(); }, async disputeHand() { const h = this.data.currentHand; await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/hands/${h.handNo}/dispute`, { note: this.data.disputeNote }); this.setData({ balance: { total: 0, isBalanced: true, allSubmitted: false, submittedCount: 0, totalCount: this.data.confirmationTotal } }); await this.refreshRoom(); },
    async loadSummary() { this.setData({ summary: await request_1.api.get(`/team-ledger/rooms/${this.data.roomCodeInput}/summary`) }); }, async loadSettlement() { try {
        const settlements = await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/settlement`, {});
        this.setData({ settlements });
        wx.showToast({ title: settlements.length ? `已生成 ${settlements.length} 条结算建议` : "当前无需互相结算", icon: "none" });
    }
    catch (e) {
        wx.showToast({ title: e.message || "生成结算失败", icon: "none" });
    } }, async endRoom() { await request_1.api.post(`/team-ledger/rooms/${this.data.roomCodeInput}/end`, {}); await this.refreshRoom(); await this.loadSummary(); }, leaveRoom() { if (timer) {
        clearInterval(timer);
        timer = null;
    } this.setData({ mode: "", room: null, currentHand: null, summary: null }); } });
