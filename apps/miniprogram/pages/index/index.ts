Page({
  data: {
    cards: [
      {
        title: "个人记账",
        desc: "记录自己的每一场牌局",
        url: "/pages/ledger-personal/ledger-personal"
      },
      {
        title: "团队记账",
        desc: "多人共同确认，减少账目争议",
        url: "/pages/ledger-team/ledger-team"
      },
      {
        title: "线上练习",
        desc: "模拟筹码练习，不涉及充值提现",
        url: "/pages/practice/practice"
      },
      {
        title: "数据中心",
        desc: "查看长期表现和训练数据",
        url: "/pages/stats/stats"
      },
      {
        title: "我的",
        desc: "团队、房间、合规声明",
        url: "/pages/mine/mine"
      }
    ]
  },
  navigate(event: WechatMiniprogram.TouchEvent) {
    const url = event.currentTarget.dataset.url;
    if (typeof url === "string") {
      wx.navigateTo({ url });
    }
  }
});
