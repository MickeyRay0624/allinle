import { Descriptions, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface PracticeHandRow {
  id: string;
  handNo: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  boardCards?: string[];
  potSize: number;
  status: string;
  winnerInfo?: any;
  startedAt: string;
  endedAt?: string | null;
  room: {
    roomCode: string;
    smallBlind: number;
    bigBlind: number;
    owner?: { nickname?: string; openid: string };
  };
  players: Array<{
    id: string;
    seatNo: number;
    nickname?: string | null;
    isBot: boolean;
    botLevel?: string | null;
    holeCards?: string[];
    startChips: number;
    endChips?: number | null;
    invested: number;
    netResult?: number | null;
    finalStatus: string;
    showdown: boolean;
    handRankDescription?: string | null;
  }>;
  actions: Array<{
    id: string;
    seatNo: number;
    actionType: string;
    amount?: number | null;
    street: string;
    createdAt: string;
  }>;
}

export function PracticeHandsPage() {
  const [data, setData] = useState<PracticeHandRow[]>([]);

  const load = () =>
    api.get<PracticeHandRow[]>("/admin/practice-hands").then(setData).catch((error) => {
      message.error(error.message);
    });

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Typography.Title level={3} className="page-title">
        练习手牌记录
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={data}
        expandable={{
          expandedRowRender: (row) => (
            <>
              <Descriptions size="small" column={4}>
                <Descriptions.Item label="按钮位">#{row.dealerSeat}</Descriptions.Item>
                <Descriptions.Item label="小盲">#{row.smallBlindSeat}</Descriptions.Item>
                <Descriptions.Item label="大盲">#{row.bigBlindSeat}</Descriptions.Item>
                <Descriptions.Item label="公共牌">{formatCards(row.boardCards)}</Descriptions.Item>
              </Descriptions>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={row.players}
                columns={[
                  { title: "座位", dataIndex: "seatNo", render: (seatNo) => `#${seatNo}` },
                  { title: "昵称", dataIndex: "nickname", render: (value) => value || "-" },
                  { title: "类型", render: (_, player) => (player.isBot ? <Tag color="gold">{player.botLevel}</Tag> : <Tag>用户</Tag>) },
                  { title: "手牌", dataIndex: "holeCards", render: formatCards },
                  { title: "起始筹码", dataIndex: "startChips" },
                  { title: "结束筹码", dataIndex: "endChips" },
                  { title: "投入", dataIndex: "invested" },
                  { title: "净结果", dataIndex: "netResult" },
                  { title: "摊牌", dataIndex: "showdown", render: (value) => (value ? "是" : "否") },
                  { title: "牌型", dataIndex: "handRankDescription", render: (value) => value || "-" },
                  { title: "最终状态", dataIndex: "finalStatus", render: (status) => <Tag>{status}</Tag> }
                ]}
              />
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={row.actions}
                columns={[
                  { title: "街道", dataIndex: "street" },
                  { title: "座位", dataIndex: "seatNo", render: (seatNo) => (seatNo ? `#${seatNo}` : "系统") },
                  { title: "动作", dataIndex: "actionType" },
                  { title: "数量", dataIndex: "amount" },
                  { title: "时间", dataIndex: "createdAt", render: formatTime }
                ]}
              />
            </>
          )
        }}
        columns={[
          { title: "房间码", render: (_, row) => row.room.roomCode },
          { title: "手牌号", dataIndex: "handNo" },
          { title: "状态", dataIndex: "status", render: (status) => <Tag>{status}</Tag> },
          { title: "盲注", render: (_, row) => `${row.room.smallBlind}/${row.room.bigBlind}` },
          { title: "底池", dataIndex: "potSize" },
          { title: "房主", render: (_, row) => row.room.owner?.nickname || row.room.owner?.openid || "-" },
          { title: "开始时间", dataIndex: "startedAt", render: formatTime },
          { title: "结束时间", dataIndex: "endedAt", render: formatTime }
        ]}
      />
    </>
  );
}

function formatCards(cards?: string[] | null) {
  return cards?.length ? cards.join(" ") : "-";
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}
