import { Button, Card, Input, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export function SystemConfigPage() {
  const [text, setText] = useState("{}");

  useEffect(() => {
    api.get<Record<string, unknown>>("/admin/system-config").then((config) => {
      setText(JSON.stringify(config, null, 2));
    });
  }, []);

  async function save() {
    try {
      const config = JSON.parse(text) as Record<string, unknown>;
      const next = await api.patch<Record<string, unknown>>("/admin/system-config", { config });
      setText(JSON.stringify(next, null, 2));
      message.success("配置已保存");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "JSON 格式错误");
    }
  }

  return (
    <>
      <Typography.Title level={3} className="page-title">
        系统配置
      </Typography.Title>
      <Card>
        <Input.TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={18}
          spellCheck={false}
        />
        <div className="toolbar" style={{ marginTop: 16 }}>
          <Button type="primary" onClick={save}>
            保存配置
          </Button>
        </div>
      </Card>
    </>
  );
}
