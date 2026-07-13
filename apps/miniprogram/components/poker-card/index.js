"use strict";

const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLORS = { S: "#1a1a2e", H: "#cc3333", D: "#cc3333", C: "#1a1a2e" };
const RANK_DISPLAY = {
  "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8",
  "9": "9", "T": "10", "J": "J", "Q": "Q", "K": "K", "A": "A"
};

Component({
  properties: {
    card: {
      type: String,
      value: "",
      observer: "_parseCard"
    },
    faceDown: {
      type: Boolean,
      value: false
    },
    size: {
      type: String,
      value: "normal"
    },
    highlight: {
      type: Boolean,
      value: false
    },
    faded: {
      type: Boolean,
      value: false
    },
    dealt: {
      type: Boolean,
      value: false
    }
  },
  data: {
    rank: "",
    suit: "",
    color: "#fff",
    symbol: "",
    _dealt: false
  },
  lifetimes: {
    attached() {
      if (this.properties.card) {
        this._parseCard(this.properties.card);
      }
    }
  },
  observers: {
    "dealt": function(val) {
      if (val) {
        this.setData({ _dealt: true });
      }
    }
  },
  methods: {
    _parseCard(card) {
      if (!card || card.length < 2 || this.properties.faceDown) {
        this.setData({ rank: "", suit: "", color: "#fff", symbol: "" });
        return;
      }
      const rank = card[0];
      const suit = card[1];
      this.setData({
        rank: RANK_DISPLAY[rank] || rank,
        suit: suit,
        color: SUIT_COLORS[suit] || "#fff",
        symbol: SUIT_SYMBOLS[suit] || ""
      });
    }
  }
});
