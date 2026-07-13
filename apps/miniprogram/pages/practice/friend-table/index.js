"use strict";
var request = require("../../../utils/request");
var api = request.api;
var ensureDevLogin = request.ensureDevLogin;
var practiceRoomSocket = require("../../../utils/socket").practiceRoomSocket;
var store = require("../../../store/index").store;

var ACTION_LABELS = {
  FOLD: "Fold", CHECK: "Check", CALL: "Call",
  BET: "Bet", RAISE: "Raise", ALL_IN: "All-in"
};

var STREET_LABELS = {
  PREFLOP: "翻牌前", FLOP: "翻牌", TURN: "转牌",
  RIVER: "河牌", SHOWDOWN: "摊牌"
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
    room: null,
    connected: false,
    gameState: null,
    privateState: null,
    userId: "",
    isOwner: false,
    isMyTurn: false,
    currentTurnNickname: "",
    playerCount: 0,
    seatPlayers: [],
    displayBoardCards: [],
    winnerInfo: null,
    legalActionMap: emptyLegalActionMap(),
    actionAmount: "",
    streetLabel: ""
  },
  pollTimer: 0,

  async onLoad(query) {
    var roomCode = query.roomCode || "";
    this.setData({ roomCode: roomCode });
    await ensureDevLogin();
    var user = wx.getStorageSync("user") || store.getState().user || {};
    this.setData({ userId: user.id || "" });

    await this.loadGameState(true);
    this.connectSocket();
    this.startPolling();
  },

  onUnload() {
    this.stopPolling();
    if (this.data.roomCode) {
      practiceRoomSocket.leaveRoom(this.data.roomCode);
    }
    practiceRoomSocket.close();
  },

  onHide() {
    this.stopPolling();
    this.startPolling(5000);
  },

  onShow() {
    this.stopPolling();
    this.startPolling();
    this.loadGameState(true);
  },

  startPolling: function(interval) {
    if (!interval) interval = 2000;
    if (this.pollTimer) clearInterval(this.pollTimer);
    var self = this;
    this.pollTimer = setInterval(function() {
      self.loadGameState(true);
    }, interval);
  },

  stopPolling: function() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = 0;
    }
  },

  async loadGameState(silent) {
    if (!this.data.roomCode) return;
    try {
      var gameView = await api.get("/practice/rooms/" + this.data.roomCode + "/game-state");
      this.applyGameView(gameView);
    } catch (error) {
      if (!silent) this.showError(error);
    }
  },

  connectSocket() {
    var self = this;

    practiceRoomSocket.on("public_game_state", function(gameState) {
      self.setData({ gameState: gameState, connected: true });
      self.updateSeatPlayers();
      self.updateBoardCards(false);
      self.updateStreetLabel();
    });

    practiceRoomSocket.on("private_hand_state", function(privateState) {
      self.applyPrivateState(privateState);
    });

    practiceRoomSocket.on("room_state", function(room) {
      self.setData({ room: room, connected: true });
    });

    practiceRoomSocket.on("action_applied", function(action) {
      self.showActionBubble(action);
    });

    practiceRoomSocket.on("street_changed", function(gameState) {
      self.setData({ gameState: gameState });
      self.updateSeatPlayers();
      self.updateBoardCards(true);
      self.updateStreetLabel();
    });

    practiceRoomSocket.on("hand_finished", function(gameState) {
      self.setData({ gameState: gameState });
      self.updateSeatPlayers();
      self.updateBoardCards(false);
      self.loadGameState(true);
    });

    practiceRoomSocket.on("next_hand_started", function(gameState) {
      self.setData({ gameState: gameState, winnerInfo: null });
      self.updateSeatPlayers();
      self.updateBoardCards(true);
      self.updateStreetLabel();
      self.loadGameState(true);
    });

    practiceRoomSocket.on("room_finished", function(payload) {
      if (payload && payload.players) {
        self.setData({ room: payload });
      } else {
        self.setData({ gameState: payload });
      }
    });

    practiceRoomSocket.on("room_closed", function() {
      wx.showToast({ title: "房间已关闭", icon: "none" });
      setTimeout(function() { wx.navigateBack(); }, 1500);
    });

    practiceRoomSocket.on("invalid_action", function(payload) {
      wx.showToast({ title: (payload && payload.message) || "行动不合法", icon: "none" });
    });

    practiceRoomSocket.on("error_message", function(payload) {
      wx.showToast({ title: (payload && payload.message) || "同步失败", icon: "none" });
    });

    // Re-join and sync on reconnect
    practiceRoomSocket.onReconnect(function() {
      practiceRoomSocket.joinRoom(self.data.roomCode);
      practiceRoomSocket.getGameState(self.data.roomCode);
      self.loadGameState(true);
    });

    practiceRoomSocket.joinRoom(this.data.roomCode);
    practiceRoomSocket.getGameState(this.data.roomCode);
  },

  applyGameView(gameView) {
    if (!gameView) return;
    var publicState = gameView.publicState;
    var privateState = gameView.privateState;
    var roomState = gameView.roomState;

    this.setData({
      room: roomState || this.data.room,
      gameState: publicState || this.data.gameState,
      privateState: privateState || this.data.privateState,
      connected: practiceRoomSocket.isConnected(),
      isOwner: roomState ? roomState.ownerUserId === this.data.userId : this.data.isOwner
    });

    if (privateState) this.applyPrivateState(privateState);
    this.updateSeatPlayers();
    this.updateBoardCards(false);
    this.updateStreetLabel();
    this.updateWinnerInfo(publicState);
  },

  applyPrivateState(privateState) {
    this.setData({
      privateState: privateState,
      legalActionMap: this.buildLegalActionMap(privateState)
    });
    this.updateMyTurn(privateState);
  },

  buildLegalActionMap(privateState) {
    var map = emptyLegalActionMap();
    var actions = Array.isArray(privateState && privateState.legalActions) ? privateState.legalActions : [];
    actions.forEach(function(action) {
      var label = ACTION_LABELS[action.actionType] || action.actionType;
      if (action.actionType === "CALL" && action.callAmount) {
        label = "Call " + action.callAmount;
      }
      if ((action.actionType === "BET" || action.actionType === "RAISE") && action.minAmount) {
        label = ACTION_LABELS[action.actionType] + " " + action.minAmount + "+";
      }
      map[action.actionType] = { enabled: true, label: label };
    });
    return map;
  },

  updateMyTurn(privateState) {
    var gameState = this.data.gameState;
    if (!gameState || !privateState) {
      this.setData({ isMyTurn: false });
      return;
    }
    var isMyTurn = gameState.currentTurnSeat === privateState.seatNo && gameState.status === "PLAYING";
    var currentTurnPlayer = (gameState.players || []).find(function(p) {
      return p.seatNo === gameState.currentTurnSeat;
    });
    this.setData({
      isMyTurn: isMyTurn,
      currentTurnNickname: currentTurnPlayer ? currentTurnPlayer.nickname : ""
    });
  },

  updateSeatPlayers() {
    var gameState = this.data.gameState;
    if (!gameState || !gameState.players) {
      this.setData({ seatPlayers: [], playerCount: 0 });
      return;
    }
    var players = gameState.players.filter(function(p) {
      return p.status !== "OUT" && p.status !== "SITTING_OUT";
    });

    var privateState = this.data.privateState;
    var mySeatNo = privateState ? privateState.seatNo : -1;

    var seatPlayers = players.map(function(p, idx) {
      return {
        seatNo: p.seatNo,
        nickname: p.nickname || "成员",
        chips: p.chips,
        status: p.status,
        invested: p.investedThisStreet || 0,
        isCurrent: mySeatNo === p.seatNo,
        isTurn: gameState.currentTurnSeat === p.seatNo && gameState.status === "PLAYING",
        isDealer: gameState.dealerSeat === p.seatNo,
        isWinner: false,
        displayCards: (p.holeCards || []).map(function(card) {
          return {
            card: card,
            faceDown: mySeatNo !== p.seatNo
          };
        }),
        position: "pos-" + idx,
        lastAction: p.lastAction || ""
      };
    });

    var count = seatPlayers.length;
    seatPlayers.forEach(function(sp, i) {
      sp.position = assignPosition(i, count);
    });

    this.setData({ seatPlayers: seatPlayers, playerCount: count });
  },

  updateBoardCards(animate) {
    var gameState = this.data.gameState;
    if (!gameState || !gameState.boardCards) {
      this.setData({ displayBoardCards: [] });
      return;
    }
    var cards = (gameState.boardCards || []).map(function(card) {
      return { card: card, faceDown: false, dealt: animate };
    });
    while (cards.length < 5) {
      cards.push({ card: "", faceDown: true, dealt: false });
    }
    this.setData({ displayBoardCards: cards });

    if (animate) {
      var self = this;
      setTimeout(function() {
        var current = self.data.displayBoardCards;
        if (current.length > 0) {
          var reset = current.map(function(c) {
            return Object.assign({}, c, { dealt: false });
          });
          self.setData({ displayBoardCards: reset });
        }
      }, 500);
    }
  },

  updateStreetLabel() {
    var gameState = this.data.gameState;
    this.setData({
      streetLabel: gameState ? (STREET_LABELS[gameState.street] || gameState.street) : ""
    });
  },

  updateWinnerInfo(gameState) {
    if (!gameState || gameState.status !== "HAND_FINISHED") return;
    this.setData({ winnerInfo: gameState.winnerInfo || null });
  },

  showActionBubble(action) {
    if (!action) return;
    var seatPlayers = this.data.seatPlayers.slice();
    var target = seatPlayers.find(function(sp) { return sp.seatNo === action.seatNo; });
    if (target) {
      target.lastAction = (ACTION_LABELS[action.actionType] || action.actionType);
      if (action.amount > 0) {
        target.lastAction = target.lastAction + " " + action.amount;
      }
      this.setData({ seatPlayers: seatPlayers });

      var self = this;
      setTimeout(function() {
        var current = self.data.seatPlayers.slice();
        var t = current.find(function(sp) { return sp.seatNo === action.seatNo; });
        if (t) { t.lastAction = ""; self.setData({ seatPlayers: current }); }
      }, 1800);
    }
  },

  onAmountChange(event) {
    this.setData({ actionAmount: String((event.detail || {}).value || "") });
  },

  async sendAction(event) {
    var actionType = (event.currentTarget.dataset || {}).action || (event.target.dataset || {}).action;
    if (!actionType) return;
    var legalAction = (this.data.legalActionMap || {})[actionType];
    if (!legalAction || !legalAction.enabled) {
      wx.showToast({ title: "当前不能执行该动作", icon: "none" });
      return;
    }

    var payload = { actionType: actionType };
    if (actionType === "BET" || actionType === "RAISE") {
      var inputAmount = Number(this.data.actionAmount);
      var amount = Number.isFinite(inputAmount) && inputAmount > 0 ? inputAmount : legalAction.minAmount;
      if (!amount) {
        wx.showToast({ title: "请输入下注或加注数量", icon: "none" });
        return;
      }
      payload.amount = amount;
    }

    try {
      var gameView = await api.post("/practice/rooms/" + this.data.roomCode + "/actions", payload);
      this.applyGameView(gameView);
      this.setData({ actionAmount: "" });
      await this.loadGameState(true);
    } catch (error) {
      this.showError(error);
    }
  },

  async nextHand() {
    try {
      var gameView = await api.post("/practice/rooms/" + this.data.roomCode + "/next-hand", {});
      this.applyGameView(gameView);
      await this.loadGameState(true);
    } catch (error) {
      this.showError(error);
    }
  },

  viewReplay() {
    var handId = (this.data.gameState || {}).handId;
    if (!handId) {
      wx.showToast({ title: "暂无可复盘手牌", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/practice-replay/practice-replay?handId=" + handId + "&roomCode=" + this.data.roomCode });
  },

  leaveTable() {
    wx.redirectTo({ url: "/pages/practice/practice" });
  },

  showError(error) {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败",
      icon: "none"
    });
  }
});

function assignPosition(index, count) {
  if (count <= 2) return index === 0 ? "top" : "bot";
  if (count === 3) return index === 2 ? "bot" : "t" + index;
  if (count === 4) return index < 2 ? "t" + index : "b" + (index - 2);
  if (count <= 6) {
    if (index < 3) return "t" + index;
    return "b" + (index - 3);
  }
  if (index === 0) return "t0";
  if (index === 1) return "t1";
  if (index === 2) return "t2";
  if (index === count - 3) return "b0";
  if (index === count - 2) return "b1";
  if (index === count - 1) return "b2";
  if (index === 3) return "l0";
  return "r0";
}
