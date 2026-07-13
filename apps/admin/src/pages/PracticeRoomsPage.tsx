import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface PracticeRoomRow {
  id: string;
  roomCode: string;
  mode: string;
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  status: string;
  initialPracticeChips: number;
  startedAt?: string | null;
  endedAt?: string | null;
  owner?: { nickname?: string; openid: string };
  players: Array<{
    id: string;
    seatNo: number;
    chips: number;
    readyStatus: boolean;
    initialChipsConfirmed: boolean;
    isBot: boolean;
    botLevel?: string | null;
  }>;
  _count?: { hands: number };
}

export function PracticeRoomsPage() {
  const [data, setData] = useState<PracticeRoomRow[]>([]);

  const load = () =>
    api.get<PracticeRoomRow[]>("/admin/practice-rooms").then(setData).catch((error) => {
      message.error(error.message);
    });

  useEffect(() => {
    load();
  }, []);

  async function closeRoom(id: string) {
    await api.post(`/admin/practice-rooms/${id}/close`);
    message.success("房间已关闭");
    load();
  }

  return (
    <>
      <Typography.Title level={3} className="page-title">
        练习房管理
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={data}
        expandable={{
          expandedRowRender: (row) => (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={row.players}
              columns={[
                { title: "座位", dataIndex: "seatNo", render: (seatNo) => `#${seatNo}` },
                { title: "筹码", dataIndex: "chips" },
                { title: "类型", render: (_, player) => (player.isBot ? <Tag color="gold">{player.botLevel}</Tag> : <Tag>用户</Tag>) },
                { title: "确认筹码", dataIndex: "initialChipsConfirmed", render: (value) => (value ? "是" : "否") },
                { title: "准备", dataIndex: "readyStatus", render: (value) => (value ? "是" : "否") }
              ]}
            />
          )
        }}
        columns={[
          { title: "房间码", dataIndex: "roomCode" },
          { title: "模式", dataIndex: "mode", render: (mode) => <Tag>{mode}</Tag> },
          { title: "状态", dataIndex: "status" },
          { title: "房主", render: (_, row) => row.owner?.nickname || row.owner?.openid || "-" },
          { title: "人数", render: (_, row) => `${row.players.length}/${row.playerCount}` },
          { title: "盲注", render: (_, row) => `${row.smallBlind}/${row.bigBlind}` },
          { title: "手牌数", render: (_, row) => row._count?.hands || 0 },
          { title: "初始模拟练习筹码", dataIndex: "initialPracticeChips" },
          { title: "开始时间", dataIndex: "startedAt", render: formatTime },
          { title: "结束时间", dataIndex: "endedAt", render: formatTime },
          {
            title: "操作",
            render: (_, row) => (
              <Space>
                <Popconfirm title="确认强制关闭异常房间？" onConfirm={() => closeRoom(row.id)}>
                  <Button danger size="small" disabled={row.status === "CLOSED"}>
                    强制关闭
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />
    </>
  );
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}
