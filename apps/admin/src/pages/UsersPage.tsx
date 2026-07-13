import { Button, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface UserRow {
  id: string;
  openid: string;
  nickname: string;
  status: "NORMAL" | "LIMITED" | "BANNED";
  createdAt: string;
}

const statusColor: Record<UserRow["status"], string> = {
  NORMAL: "green",
  LIMITED: "gold",
  BANNED: "red"
};

export function UsersPage() {
  const [data, setData] = useState<UserRow[]>([]);

  const load = () =>
    api.get<UserRow[]>("/admin/users").then(setData).catch((error) => message.error(error.message));

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: UserRow["status"]) {
    await api.patch(`/admin/users/${id}/status`, { status });
    message.success("状态已更新");
    load();
  }

  return (
    <>
      <Typography.Title level={3} className="page-title">
        用户管理
      </Typography.Title>
      <Table
        rowKey="id"
        dataSource={data}
        columns={[
          { title: "昵称", dataIndex: "nickname" },
          { title: "OpenID", dataIndex: "openid", ellipsis: true },
          {
            title: "状态",
            dataIndex: "status",
            render: (status: UserRow["status"]) => <Tag color={statusColor[status]}>{status}</Tag>
          },
          { title: "创建时间", dataIndex: "createdAt" },
          {
            title: "操作",
            render: (_, row) => (
              <Space>
                <Select
                  size="small"
                  value={row.status}
                  style={{ width: 110 }}
                  options={[
                    { value: "NORMAL", label: "正常" },
                    { value: "LIMITED", label: "限制" },
                    { value: "BANNED", label: "封禁" }
                  ]}
                  onChange={(value) => updateStatus(row.id, value)}
                />
                <Button size="small" onClick={() => updateStatus(row.id, "NORMAL")}>
                  恢复
                </Button>
              </Space>
            )
          }
        ]}
      />
    </>
  );
}
