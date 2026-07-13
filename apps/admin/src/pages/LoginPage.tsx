import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();

  async function onFinish(values: { username: string; password: string }) {
    try {
      const result = await api.post<{ token: string; admin: { id: string; username: string; role: string } }>("/admin/auth/login", values);
      localStorage.setItem("admin_token", result.token);
      localStorage.setItem("admin", JSON.stringify(result.admin));
      message.success("登录成功");
      navigate("/");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <Typography.Title level={2}>ALLINLE</Typography.Title>
        <Typography.Paragraph type="secondary">管理后台</Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="admin" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
