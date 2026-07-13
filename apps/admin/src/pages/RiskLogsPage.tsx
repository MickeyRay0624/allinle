import { Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface RiskLogRow {
  id: string;
  eventType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  detail: Record<string, unknown>;
  createdAt: string;
  user?: { nickname?: string; openid: string };
  room?: { roomCode: string };
}

const colorMap: Record<RiskLogRow["riskLevel"], string> = {
  LOW: "blue",
  MEDIUM: "gold",
  HIGH: "red"
};

export function RiskLogsPage() {
  const [data, setData] = useState<RiskLogRow[]>([]);

  useEffect(() => {
    api.get<RiskLogRow[]>("/admin/risk-logs").then(setData).catch((error) => {
      message.error(error.message);
    });
  }, []);

  return (
    <>
      <Typography.Title level={3} className="page-title">
        风控日志
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={data}
        columns={[
          { title: "事件", dataIndex: "eventType" },
          {
            title: "等级",
            dataIndex: "riskLevel",
            filters: [
              { text: "LOW", value: "LOW" },
              { text: "MEDIUM", value: "MEDIUM" },
              { text: "HIGH", value: "HIGH" }
            ],
            onFilter: (value, row) => row.riskLevel === value,
            render: (level) => <Tag color={colorMap[level as RiskLogRow["riskLevel"]]}>{level}</Tag>
          },
          {
            title: "用户",
            filters: Array.from(
              new Set(data.map((row) => row.user?.nickname || row.user?.openid).filter(Boolean))
            ).map((value) => ({ text: value as string, value: value as string })),
            onFilter: (value, row) => (row.user?.nickname || row.user?.openid || "-") === value,
            render: (_, row) => row.user?.nickname || row.user?.openid || "-"
          },
          {
            title: "房间",
            filters: Array.from(new Set(data.map((row) => row.room?.roomCode).filter(Boolean))).map(
              (value) => ({ text: value as string, value: value as string })
            ),
            onFilter: (value, row) => (row.room?.roomCode || "-") === value,
            render: (_, row) => row.room?.roomCode || "-"
          },
          { title: "详情", render: (_, row) => JSON.stringify(row.detail) },
          { title: "时间", dataIndex: "createdAt" }
        ]}
      />
    </>
  );
}
