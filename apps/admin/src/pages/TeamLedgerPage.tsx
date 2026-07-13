import { Card, Table, Tag, Button, message, Modal, Descriptions, Typography, Space } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

const statusMap: Record<string, { color: string; label: string }> = {
  WAITING: { color: "blue", label: "等待中" },
  ACTIVE: { color: "green", label: "记账中" },
  FINISHED: { color: "gold", label: "已结束" },
  CLOSED: { color: "default", label: "已关闭" },
};

interface TeamLedgerRoom {
  id: string;
  roomCode: string;
  title: string;
  ownerUserId: string;
  status: string;
  currentHandNo: number;
  createdAt: string;
  owner: { id: string; nickname: string; openid: string };
  participants: { id: string; displayName: string; role: string; status: string }[];
  _count: { hands: number };
}

export function TeamLedgerPage() {
  const [rooms, setRooms] = useState<TeamLedgerRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailRoom, setDetailRoom] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchRooms = () => {
    setLoading(true);
    api
      .get<TeamLedgerRoom[]>("/admin/team-ledger-rooms")
      .then(setRooms)
      .catch((err) => message.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const showDetail = async (roomCode: string) => {
    try {
      const room = await api.get<any>(`/admin/team-ledger-rooms/${roomCode}`);
      setDetailRoom(room);
      setDetailVisible(true);
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const closeRoom = async (roomCode: string) => {
    Modal.confirm({
      title: "确认关闭",
      content: "关闭后该记账房将无法再进行任何操作。确定要关闭吗？",
      onOk: async () => {
        try {
          await api.post(`/admin/team-ledger-rooms/${roomCode}/close`);
          message.success("已关闭");
          fetchRooms();
        } catch (err: any) {
          message.error(err.message);
        }
      },
    });
  };

  const columns = [
    {
      title: "房间码",
      dataIndex: "roomCode",
      key: "roomCode",
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    {
      title: "名称",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "房主",
      key: "owner",
      render: (_: any, record: TeamLedgerRoom) => record.owner?.nickname || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const info = statusMap[status] || { color: "default", label: status };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "当前手数",
      dataIndex: "currentHandNo",
      key: "currentHandNo",
    },
    {
      title: "总手数",
      key: "totalHands",
      render: (_: any, record: TeamLedgerRoom) => record._count?.hands ?? 0,
    },
    {
      title: "参与者",
      key: "participants",
      render: (_: any, record: TeamLedgerRoom) =>
        record.participants?.map((p) => (
          <Tag key={p.id}>
            {p.displayName}
            {p.role === "OWNER" ? "(房主)" : ""}
          </Tag>
        )),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: any, record: TeamLedgerRoom) => (
        <Space>
          <Button size="small" onClick={() => showDetail(record.roomCode)}>
            详情
          </Button>
          {record.status !== "CLOSED" && (
            <Button size="small" danger onClick={() => closeRoom(record.roomCode)}>
              关闭
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={3} className="page-title">
        团队记账房管理
      </Typography.Title>
      <Card>
        <Table
          dataSource={rooms}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="团队记账房详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {detailRoom && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="房间码">
                <Typography.Text code>{detailRoom.roomCode}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailRoom.status]?.color}>
                  {statusMap[detailRoom.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="名称">{detailRoom.title || "-"}</Descriptions.Item>
              <Descriptions.Item label="房主">{detailRoom.owner?.nickname}</Descriptions.Item>
              <Descriptions.Item label="当前手数">{detailRoom.currentHandNo}</Descriptions.Item>
              <Descriptions.Item label="总手数">{detailRoom.hands?.length || 0}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {new Date(detailRoom.createdAt).toLocaleString("zh-CN")}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>参与者</Typography.Title>
            <Table
              dataSource={detailRoom.participants || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: "座位", dataIndex: "seatNo", key: "seatNo" },
                { title: "姓名", dataIndex: "displayName", key: "displayName" },
                {
                  title: "角色",
                  dataIndex: "role",
                  key: "role",
                  render: (role: string) => (role === "OWNER" ? "房主" : "成员"),
                },
                {
                  title: "状态",
                  dataIndex: "status",
                  key: "status",
                  render: (status: string) => (
                    <Tag color={status === "ACTIVE" ? "green" : "default"}>
                      {status === "ACTIVE" ? "活跃" : status}
                    </Tag>
                  ),
                },
              ]}
            />

            <Typography.Title level={5} style={{ marginTop: 16 }}>
              手牌与异议记录
            </Typography.Title>
            <Table
              dataSource={detailRoom.hands || []}
              rowKey="id"
              size="small"
              pagination={false}
              expandable={{
                expandedRowRender: (hand: any) => (
                  <Table
                    dataSource={hand.entries || []}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: "玩家",
                        key: "participant",
                        render: (_: any, entry: any) => entry.participant?.displayName || "-",
                      },
                      {
                        title: "本手金额",
                        dataIndex: "amount",
                        key: "amount",
                        render: (amount: any) => {
                          const value = Number(amount);
                          return `${value >= 0 ? "+" : ""}${value}`;
                        },
                      },
                      {
                        title: "提交/确认状态",
                        dataIndex: "status",
                        key: "status",
                        render: (status: string) => (
                          <Tag color={status === "DISPUTED" ? "red" : status === "CONFIRMED" ? "green" : "blue"}>
                            {status}
                          </Tag>
                        ),
                      },
                      {
                        title: "异议原因",
                        dataIndex: "disputeNote",
                        key: "disputeNote",
                        render: (note: string | null) => note || "-",
                      },
                    ]}
                  />
                ),
              }}
              columns={[
                { title: "手数", dataIndex: "handNo", key: "handNo", render: (value: number) => `第 ${value} 手` },
                {
                  title: "状态",
                  dataIndex: "status",
                  key: "status",
                  render: (status: string) => (
                    <Tag color={status === "DISPUTED" ? "red" : status === "LOCKED" ? "green" : "blue"}>
                      {status}
                    </Tag>
                  ),
                },
                { title: "记录数", key: "entries", render: (_: any, hand: any) => hand.entries?.length || 0 },
                {
                  title: "锁定时间",
                  dataIndex: "lockedAt",
                  key: "lockedAt",
                  render: (value: string | null) => value ? new Date(value).toLocaleString("zh-CN") : "-",
                },
              ]}
            />

            <Typography.Title level={5} style={{ marginTop: 16 }}>
              结算建议
            </Typography.Title>
            {detailRoom.settlements && detailRoom.settlements.length > 0 ? (
              <Table
                dataSource={detailRoom.settlements}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: "付款方", dataIndex: "fromName", key: "fromName" },
                  { title: "收款方", dataIndex: "toName", key: "toName" },
                  {
                    title: "金额",
                    dataIndex: "amount",
                    key: "amount",
                    render: (amount: any) => `¥ ${Number(amount)}`,
                  },
                ]}
              />
            ) : (
              <Typography.Text type="secondary">暂无结算建议</Typography.Text>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
