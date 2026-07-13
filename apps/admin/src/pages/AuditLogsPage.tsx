import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: any;
  createdAt: string;
  adminUser: { id: string; username: string; role: string };
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLog[]>("/admin/audit-logs")
      .then((data) => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h2>审计日志</h2>
      <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 12, textAlign: "left" }}>时间</th>
              <th style={{ padding: 12, textAlign: "left" }}>操作人</th>
              <th style={{ padding: 12, textAlign: "left" }}>操作</th>
              <th style={{ padding: 12, textAlign: "left" }}>目标类型</th>
              <th style={{ padding: 12, textAlign: "left" }}>详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 12, fontSize: 13 }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td style={{ padding: 12, fontSize: 13 }}>{log.adminUser.username}</td>
                <td style={{ padding: 12, fontSize: 13 }}>{log.action}</td>
                <td style={{ padding: 12, fontSize: 13 }}>{log.targetType}</td>
                <td style={{ padding: 12, fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {log.detail ? JSON.stringify(log.detail) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
