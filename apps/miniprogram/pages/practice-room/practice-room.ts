import { api, ensureDevLogin } from "../../utils/request";
import { practiceRoomSocket } from "../../utils/socket";

const ACTION_LABELS: Record<string, string> = {
  FOLD: "Fold",
  CHECK: "Check",
  CALL: "Call",
  BET: "Bet",
  RAISE: "Raise",
  ALL_IN: "All-in"
};

function emptyLegalActionMap() {
  return {
    FOLD: { enabled: false, label: "Fold" },
    CHECK: { enabled: false, label: "Check" },
    CALL: { enabled: false, label: "Call" },
    BET: { enabled: false, label: "Bet" },
    RAISE: { enabled: false, label: "Raise" },
    ALL_IN: { enabled: false, label: "All-in" }
  };
}

Page({
  data: {
    roomCode: "",
    room: null as any,
    connected: false,
    gameState: null as any,
    privateState: null as any,
    legalActionMap: emptyLegalActionMap() as any,
    actionAmount: "",
    lastGameMessage: "",
    acting: false
  },
  gamePollTimer: 0 as any,
  async onLoad(query: Record<string, string | undefined>) {
    const roomCode = query.roomCode || "";
    this.setData({ roomCode });
    await ensureDevLogin();
    await this.loadRoom();
    await this.loadGameState(true);
    this.connectSocket();
    this.startPollingGameState();
  },
  onUnload() {
    if (this.gamePollTimer) {
      clearInterval(this.gamePollTimer);
      this.gamePollTimer = 0;
    }
    if (this.data.roomCode) {
      practiceRoomSocket.leaveRoom(this.data.roomCode);
    }
    practiceRoomSocket.close();
  },
  async loadRoom() {
    if (!this.data.roomCode) return;
    const room = await api.get<any>(`/practice/rooms/${this.data.roomCode}`);
    this.setData({ room });
  },
  async loadGameState(silent = false) {
    if (!this.data.roomCode) return;
    try {
      const gameView = await api.get<any>(`/practice/rooms/${this.data.roomCode}/game-state`);
      this.applyGameView(gameView, "", true);
    } catch (error) {
      if (!silent) this.showError(error);
    }
  },
  startPollingGameState() {
    if (this.gamePollTimer) clearInterval(this.gamePollTimer);
    this.gamePollTimer = setInterval(() => {
      this.loadGameState(true);
    }, 2000);
  },
  connectSocket() {
    practiceRoomSocket.on("room_state", (room) => {
      this.setData({ room, connected: true });
    });
    practiceRoomSocket.on("public_game_state", (gameState) => {
      this.setData({ gameState, connected: true });
    });
    practiceRoomSocket.on("private_hand_state", (privateState) => {
      this.applyPrivateState(privateState);
    });
    practiceRoomSocket.on("action_applied", (action) => {
      this.setData({ lastGameMessage: `#${action.seatNo} ${action.actionType} ${action.amount || ""}` });
    });
    practiceRoomSocket.on("street_changed", (gameState) => {
      this.setData({ gameState, lastGameMessage: `进入 ${gameState.street}` });
    });
    practiceRoomSocket.on("hand_finished", (gameState) => {
      this.setData({ gameState, lastGameMessage: "本手结束" });
      this.loadGameState(true);
    });
    practiceRoomSocket.on("next_hand_started", (gameState) => {
      this.setData({ gameState, lastGameMessage: "新一手开始" });
      this.loadGameState(true);
    });
    practiceRoomSocket.on("room_finished", (payload) => {
      if (payload?.players) {
        this.setData({ room: payload, gameState: null, privateState: null, lastGameMessage: "练习房已结束" });
      } else {
        this.setData({ gameState: payload, lastGameMessage: "练习房已结束" });
      }
    });
    practiceRoomSocket.on("invalid_action", (payload) => {
      wx.showToast({ title: payload.message || "行动不合法", icon: "none" });
    });
    practiceRoomSocket.on("game_error", (payload) => {
      wx.showToast({ title: payload.message || "牌局同步失败", icon: "none" });
    });
    practiceRoomSocket.on("error_message", (payload) => {
      wx.showToast({ title: payload.message || "房间同步失败", icon: "none" });
    });
    practiceRoomSocket.joinRoom(this.data.roomCode);
    practiceRoomSocket.getGameState(this.data.roomCode);
  },
  applyGameView(gameView: any, message = "", silent = false) {
    const hasPublicState = Object.prototype.hasOwnProperty.call(gameView, "publicState");
    const hasPrivateState = Object.prototype.hasOwnProperty.call(gameView, "privateState");
    const privateState = hasPrivateState ? gameView.privateState : this.data.privateState;
    this.setData({
      room: gameView.roomState || this.data.room,
      gameState: hasPublicState ? gameView.publicState : this.data.gameState,
      privateState,
      legalActionMap: this.buildLegalActionMap(privateState),
      connected: true,
      ...(message ? { lastGameMessage: message } : {}),
      ...(silent ? {} : { lastGameMessage: message || this.data.lastGameMessage })
    });
  },
  applyPrivateState(privateState: any) {
    this.setData({
      privateState,
      legalActionMap: this.buildLegalActionMap(privateState)
    });
  },
  buildLegalActionMap(privateState: any) {
    const map: any = emptyLegalActionMap();
    const actions = Array.isArray(privateState?.legalActions) ? privateState.legalActions : [];
    actions.forEach((action: any) => {
      const label = this.actionLabel(action);
      map[action.actionType] = { ...action, enabled: true, label };
    });
    return map;
  },
  actionLabel(action: any) {
    if (action.actionType === "CALL" && action.callAmount) return `Call ${action.callAmount}`;
    if ((action.actionType === "BET" || action.actionType === "RAISE") && action.minAmount) {
      return `${ACTION_LABELS[action.actionType]} ${action.minAmount}+`;
    }
    return ACTION_LABELS[action.actionType] || action.actionType;
  },
  getLegalAction(actionType: string) {
    return (this.data.legalActionMap as any)[actionType];
  },
  async confirmInitialChips() {
    try {
      await api.post(`/practice/rooms/${this.data.roomCode}/confirm-initial-chips`, {});
      practiceRoomSocket.confirmInitialChips(this.data.roomCode);
      this.loadRoom();
    } catch (error) {
      this.showError(error);
    }
  },
  async ready() {
    try {
      await api.post(`/practice/rooms/${this.data.roomCode}/ready`, { readyStatus: true });
      practiceRoomSocket.ready(this.data.roomCode, true);
      this.loadRoom();
    } catch (error) {
      this.showError(error);
    }
  },
  async startRoom() {
    try {
      const gameView = await api.post<any>(`/practice/rooms/${this.data.roomCode}/start`, {});
      this.applyGameView(gameView, "练习已开始");
      practiceRoomSocket.start(this.data.roomCode);
      this.loadRoom();
    } catch (error) {
      this.showError(error);
    }
  },
  onAmountChange(event: any) {
    this.setData({ actionAmount: String(event.detail.value || "") });
  },
  async sendAction(event: any) {
    if (this.data.acting) return;
    const actionType = (event.currentTarget.dataset.action || event.target.dataset.action) as string;
    const legalAction = this.getLegalAction(actionType);
    if (!legalAction?.enabled) {
      wx.showToast({ title: "当前不能执行该动作", icon: "none" });
      return;
    }
    const payload: Record<string, unknown> = { actionType };
    if (actionType === "BET" || actionType === "RAISE") {
      const inputAmount = Number(this.data.actionAmount);
      const amount = Number.isFinite(inputAmount) && inputAmount > 0 ? inputAmount : legalAction.minAmount;
      if (!amount) {
        wx.showToast({ title: "请输入下注或加注数量", icon: "none" });
        return;
      }
      if (legalAction.minAmount && amount < legalAction.minAmount) {
        wx.showToast({ title: `最小数量 ${legalAction.minAmount}`, icon: "none" });
        return;
      }
      if (legalAction.maxAmount && amount > legalAction.maxAmount) {
        wx.showToast({ title: `最大数量 ${legalAction.maxAmount}`, icon: "none" });
        return;
      }
      payload.amount = amount;
    }
    try {
      this.setData({ acting: true });
      const gameView = await api.post<any>(`/practice/rooms/${this.data.roomCode}/actions`, payload);
      this.applyGameView(gameView, `${ACTION_LABELS[actionType] || actionType} 已提交`);
      this.setData({ actionAmount: "" });
      await this.loadGameState(true);
    } catch (error) {
      this.showError(error);
    } finally {
      this.setData({ acting: false });
    }
  },
  async nextHand() {
    try {
      const gameView = await api.post<any>(`/practice/rooms/${this.data.roomCode}/next-hand`, {});
      this.applyGameView(gameView, "新一手开始");
      await this.loadGameState(true);
    } catch (error) {
      this.showError(error);
    }
  },
  viewReplay() {
    const handId = this.data.gameState?.handId;
    if (!handId) {
      wx.showToast({ title: "暂无可复盘手牌", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/practice-replay/practice-replay?handId=${handId}` });
  },
  async endRoom() {
    try {
      const room = await api.post<any>(`/practice/rooms/${this.data.roomCode}/end`, {});
      practiceRoomSocket.endRoom(this.data.roomCode);
      this.setData({
        room,
        gameState: null,
        privateState: null,
        legalActionMap: emptyLegalActionMap(),
        lastGameMessage: "练习房已结束"
      });
    } catch (error) {
      this.showError(error);
    }
  },
  async closeRoom() {
    try {
      await api.post(`/practice/rooms/${this.data.roomCode}/close`, {});
      wx.navigateBack();
    } catch (error) {
      this.showError(error);
    }
  },
  showError(error: unknown) {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败",
      icon: "none"
    });
  }
});
