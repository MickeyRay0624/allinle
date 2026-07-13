import { Descriptions, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface LedgerGameRow {
  id: string;
  title: string;
  type: string;
  status: string;
  totalBuyIn: string;
  totalCashOut: string;
  totalProfit: string;
  owner?: { nickname?: string; openid: string };
  team?: { name: string };
  players: Array<{
    id: string;
    displayName: string;
    totalBuyIn: string;
    totalCashOut: string;
    profit: string;
    confirmStatus: string;
  }>;
}

export function LedgerGamesPage() {
  const [data, setData] = useState<LedgerGameRow[]>([]);

  useEffect(() => {
    api.get<LedgerGameRow[]>("/admin/ledger-games").then(setData).catch((error) => {
      message.error(error.message);
    });
  }, []);

  return (
    <>
      <Typography.Title level={3} className="page-title">
        记账记录管理
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={data}
        expandable={{
          expandedRowRender: (row) => (
            <Descriptions column={2} size="small" bordered>
              {row.players.map((player) => (
                <Descriptions.Item key={player.id} label={player.displayName}>
                  买入 {player.totalBuyIn} / 带出 {player.totalCashOut} / 盈亏 {player.profit} /{" "}
                  {player.confirmStatus}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )
        }}
        columns={[
          { title: "标题", dataIndex: "title" },
          { title: "类型", dataIndex: "type", render: (type) => <Tag>{type}</Tag> },
          { title: "状态", dataIndex: "status" },
          { title: "团队", render: (_, row) => row.team?.name || "-" },
          { title: "玩家数", render: (_, row) => row.players.length },
          { title: "买入", dataIndex: "totalBuyIn" },
          { title: "带出", dataIndex: "totalCashOut" },
          { title: "盈亏", dataIndex: "totalProfit" }
        ]}
      />
    </>
  );
}
