import { api, ensureDevLogin } from "../../../utils/request";
import { practiceRoomSocket } from "../../../utils/socket";
import { store } from "../../../store/index";

let isNavigatingToTable = false;
let roomPollTimer: number | null = null;

Page({
  data: {
    roomCode: "",
    room: null as any,
    connected: false,
    isOwner: false,
    myConfirmChips: false,
    myReady: false,
    myChips: "",
    canStart: false,
    starting: false,
    lastMessage: ""
  },

  async onLoad(query: Record<string, string | undefined>) {
    isNavigatingToTable = false;
    const roomCode = query.roomCode || "";
    this.setData({ roomCode });
    await ensureDevLogin();
    await this.loadRoom();
    this.connectSocket();
    this.startRoomPolling();
  },

  onUnload() {
    if (roomPollTimer !== null) clearInterval(roomPollTimer);
    roomPollTimer = null;
    if (this.data.roomCode) {
      practiceRoomSocket.leaveRoom(this.data.roomCode);
    }
    practiceRoomSocket.close();
  },

  startRoomPolling() {
    if (roomPollTimer !== null) clearInterval(roomPollTimer);
    roomPollTimer = setInterval(async () => {
      if (isNavigatingToTable || !this.data.roomCode) return;
      try {
        const room = await api.get<any>(`/practice/rooms/${this.data.roomCode}`);
        this.updateRoomState(room);
        if (room.status === "PLAYING") this.navigateToTable(room);
      } catch (_) {}
    }, 2000) as any;
  },

  async loadRoom() {
    if (!this.data.roomCode) return;
    try {
      const room = await api.get<any>(`/practice/rooms/${this.data.roomCode}`);
      this.updateRoomState(room);
      if (room.status === "PLAYING") {
        this.navigateToTable(room);
      }
    } catch (error) {
      this.showError(error);
    }
  },

  connectSocket() {
    practiceRoomSocket.on("room_state", (room: any) => {
      this.updateRoomState(room);
    });

    practiceRoomSocket.on("room_started", (room: any) => {
      this.updateRoomState(room);
      this.navigateToTable(room);
    });

    practiceRoomSocket.on("player_ready_changed", (room: any) => {
      this.updateRoomState(room);
    });

    practiceRoomSocket.on("initial_chips_confirmed", (room: any) => {
      this.updateRoomState(room);
    });

    practiceRoomSocket.on("player_joined", () => {
      this.loadRoom();
    });

    practiceRoomSocket.on("player_left", () => {
      this.loadRoom();
    });

    practiceRoomSocket.on("room_closed", () => {
      wx.showToast({ title: "房间已关闭", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
    });

    practiceRoomSocket.on("error_message", (payload: any) => {
      wx.showToast({ title: payload.message || "房间同步失败", icon: "none" });
    });

    practiceRoomSocket.joinRoom(this.data.roomCode);
  },

  updateRoomState(room: any) {
    if (!room) return;
    const userId = (wx.getStorageSync("user") || {}).id || store.getState().user?.id || "";
    const myPlayer = room.players?.find((p: any) => p.userId === userId);
    const allReady = room.players?.every((p: any) => p.initialChipsConfirmed && p.readyStatus);
    this.setData({
      room,
      connected: practiceRoomSocket.isConnected(),
      isOwner: room.ownerUserId === userId,
      myChips: myPlayer?.chipsSetByPlayer ? String(myPlayer.chips) : this.data.myChips,
      myConfirmChips: myPlayer?.initialChipsConfirmed || false,
      myReady: myPlayer?.readyStatus || false,
      canStart: allReady && room.players?.length >= 2 && room.ownerUserId === userId
    });
  },

  onChipsInput(event: any) {
    this.setData({ myChips: event.detail.value });
  },

  async saveChips() {
    const chips = Number(this.data.myChips);
    if (!Number.isInteger(chips) || chips <= 0) {
      wx.showToast({ title: "请输入正整数筹码", icon: "none" });
      return;
    }
    try {
      const room = await api.post<any>(`/practice/rooms/${this.data.roomCode}/initial-chips`, { chips });
      this.updateRoomState(room);
      practiceRoomSocket.joinRoom(this.data.roomCode);
      wx.showToast({ title: "筹码已提交", icon: "success" });
    } catch (error) { this.showError(error); }
  },

  navigateToTable(room: any) {
    if (isNavigatingToTable) return;
    isNavigatingToTable = true;
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage?.route?.includes("friend-table")) return;
    wx.redirectTo({
      url: `/pages/practice/friend-table/index?roomCode=${room.roomCode || this.data.roomCode}`,
      fail: () => {
        isNavigatingToTable = false;
      }
    });
  },

  async confirmChips() {
    try {
      await api.post(`/practice/rooms/${this.data.roomCode}/confirm-initial-chips`, {});
      practiceRoomSocket.confirmInitialChips(this.data.roomCode);
      await this.loadRoom();
    } catch (error) {
      this.showError(error);
    }
  },

  async toggleReady() {
    try {
      const newStatus = !this.data.myReady;
      await api.post(`/practice/rooms/${this.data.roomCode}/ready`, { readyStatus: newStatus });
      practiceRoomSocket.ready(this.data.roomCode, newStatus);
      await this.loadRoom();
    } catch (error) {
      this.showError(error);
    }
  },

  async startRoom() {
    if (this.data.starting) return;
    this.setData({ starting: true });
    try {
      const gameView = await api.post<any>(`/practice/rooms/${this.data.roomCode}/start`, {});
      practiceRoomSocket.start(this.data.roomCode);
      const room = gameView.roomState || gameView;
      this.updateRoomState(room);
      this.navigateToTable(room);
    } catch (error) {
      this.setData({ starting: false });
      this.showError(error);
    }
  },

  async leaveRoom() {
    try {
      await api.post(`/practice/rooms/${this.data.roomCode}/close`, {});
    } catch (_) {}
    wx.navigateBack();
  },

  showError(error: unknown) {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败",
      icon: "none"
    });
  }
});
