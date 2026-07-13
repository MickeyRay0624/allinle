"use strict";

var DEMO_CARDS = ["AS","KS","QS","JS","TS","AH","KH","QH","JH","TH","AD","KD","QD","JD","TD","2S","3S","4S","5S","6S","7H","8H","9H","2C","3C","4C","5C","6D","7D","8D"];

Page({
  data: {
    tableSizes: [2, 4, 6, 9],
    demoPlayers: 4,
    demoBoard: [],
    demoPot: 0,
    demoSeats: [],
    demoActions: [
      { key: "deal", label: "发牌" },
      { key: "blind_sb", label: "小盲" },
      { key: "blind_bb", label: "大盲" },
      { key: "check", label: "Check" },
      { key: "call", label: "Call" },
      { key: "bet", label: "Bet" },
      { key: "raise", label: "Raise" },
      { key: "fold", label: "Fold" },
      { key: "allin", label: "All-in" },
      { key: "flop", label: "Flop" },
      { key: "turn", label: "Turn" },
      { key: "river", label: "River" },
      { key: "showdown", label: "Showdown" },
      { key: "winner", label: "Winner" }
    ]
  },

  onLoad: function() {
    this.initSeats();
  },

  initSeats: function() {
    var count = this.data.demoPlayers;
    var seats = [];
    var names = ["玩家A", "玩家B", "机器人1", "机器人2", "机器人3", "机器人4", "机器人5", "机器人6", "机器人7"];
    for (var i = 0; i < count; i++) {
      seats.push({
        index: i,
        label: names[i] || ("座位" + (i + 1)),
        chips: 1000,
        cards: [],
        highlight: false,
        folded: false,
        allIn: false,
        winner: false,
        badge: ""
      });
    }
    this.setData({ demoSeats: seats, demoBoard: [], demoPot: 0 });
  },

  setTableSize: function(e) {
    var size = parseInt(e.currentTarget.dataset.size);
    this.setData({ demoPlayers: size });
    this.initSeats();
  },

  triggerDemo: function(e) {
    var key = e.currentTarget.dataset.key;
    switch (key) {
      case "deal": this.demoDeal(); break;
      case "blind_sb": this.demoBlind(0, 25); break;
      case "blind_bb": this.demoBlind(1, 50); break;
      case "check": this.demoAction(0, "Check"); break;
      case "call": this.demoAction(0, "Call", 50); break;
      case "bet": this.demoAction(0, "Bet", 100); break;
      case "raise": this.demoAction(0, "Raise", 200); break;
      case "fold": this.demoFold(1); break;
      case "allin": this.demoAllIn(0); break;
      case "flop": this.demoBoardCards(3); break;
      case "turn": this.demoAddBoardCard(); break;
      case "river": this.demoAddBoardCard(); break;
      case "showdown": this.demoShowdown(); break;
      case "winner": this.demoWinner(0); break;
    }
  },

  demoDeal: function() {
    var seats = this.data.demoSeats.slice();
    seats.forEach(function(seat, i) {
      seat.cards = [
        { card: DEMO_CARDS[i * 2], faceDown: false, cIdx: 0 },
        { card: DEMO_CARDS[i * 2 + 1], faceDown: false, cIdx: 1 }
      ];
    });
    this.setData({ demoSeats: seats, demoPot: 75 });
    this.highlightSeat(2);
  },

  demoBlind: function(seatIdx, amount) {
    var seats = this.data.demoSeats.slice();
    if (seats[seatIdx]) {
      seats[seatIdx].chips -= amount;
      seats[seatIdx].badge = amount === 25 ? "SB" : "BB";
    }
    this.setData({ demoSeats: seats, demoPot: this.data.demoPot + amount });
  },

  demoAction: function(seatIdx, action, amount) {
    var seats = this.data.demoSeats.slice();
    if (!amount) amount = 0;
    if (seats[seatIdx]) {
      seats[seatIdx].chips -= amount;
      seats[seatIdx].badge = action;
    }
    this.setData({ demoSeats: seats, demoPot: this.data.demoPot + amount });
    if (seatIdx < seats.length - 1) {
      this.highlightSeat(seatIdx + 1);
    }
    var self = this;
    setTimeout(function() {
      var s = self.data.demoSeats.slice();
      s.forEach(function(x) { x.badge = ""; });
      self.setData({ demoSeats: s });
    }, 1500);
  },

  demoFold: function(seatIdx) {
    var seats = this.data.demoSeats.slice();
    if (seats[seatIdx]) {
      seats[seatIdx].folded = true;
      seats[seatIdx].cards = [];
    }
    this.setData({ demoSeats: seats });
  },

  demoAllIn: function(seatIdx) {
    var seats = this.data.demoSeats.slice();
    if (seats[seatIdx]) {
      var chips = seats[seatIdx].chips;
      seats[seatIdx].chips = 0;
      seats[seatIdx].allIn = true;
      seats[seatIdx].badge = "ALL-IN";
      this.setData({ demoSeats: seats, demoPot: this.data.demoPot + chips });
    }
  },

  demoBoardCards: function(count) {
    var board = [];
    for (var i = 0; i < count; i++) {
      board.push({ card: DEMO_CARDS[20 + i], faceDown: false, dealt: true });
    }
    this.setData({ demoBoard: board });
    var self = this;
    setTimeout(function() {
      var b = self.data.demoBoard.slice();
      b.forEach(function(c) { c.dealt = false; });
      self.setData({ demoBoard: b });
    }, 500);
  },

  demoAddBoardCard: function() {
    var board = this.data.demoBoard.slice();
    var nextIdx = board.filter(function(c) { return c.card; }).length;
    board.push({ card: DEMO_CARDS[20 + nextIdx], faceDown: false, dealt: true });
    while (board.length < 5) {
      board.push({ card: "", faceDown: true, dealt: false });
    }
    if (board.length > 5) board = board.slice(0, 5);
    this.setData({ demoBoard: board });
    var self = this;
    setTimeout(function() {
      var b = self.data.demoBoard.slice();
      b.forEach(function(c) { c.dealt = false; });
      self.setData({ demoBoard: b });
    }, 500);
  },

  demoShowdown: function() {
    var seats = this.data.demoSeats.slice();
    seats.forEach(function(s) {
      if (!s.folded && s.cards.length === 0) {
        s.cards = [
          { card: "AH", faceDown: false, cIdx: 0 },
          { card: "KH", faceDown: false, cIdx: 1 }
        ];
      }
    });
    this.setData({ demoSeats: seats });
  },

  demoWinner: function(seatIdx) {
    var seats = this.data.demoSeats.slice();
    seats.forEach(function(s) { s.winner = false; });
    if (seats[seatIdx]) {
      seats[seatIdx].winner = true;
      seats[seatIdx].badge = "WIN";
      seats[seatIdx].chips += this.data.demoPot;
    }
    this.setData({ demoSeats: seats, demoPot: 0 });
  },

  highlightSeat: function(idx) {
    var seats = this.data.demoSeats.slice();
    seats.forEach(function(s) { s.highlight = false; });
    if (seats[idx]) seats[idx].highlight = true;
    this.setData({ demoSeats: seats });
  },

  resetDemo: function() {
    this.setData({ demoPot: 0, demoBoard: [] });
    this.initSeats();
  }
});
