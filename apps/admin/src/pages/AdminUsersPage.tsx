import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "OPERATOR" });
  const [msg, setMsg] = useState("");

  const fetchAdmins = async () => {
    try {
      const data = await api.get<AdminUser[]>("/admin/users/admins");
      setAdmins(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post("/admin/users/admins", form);
      setMsg("创建成功");
      setShowCreate(false);
      setForm({ username: "", password: "", role: "OPERATOR" });
      fetchAdmins();
    } catch (e: any) {
      setMsg(e.message || "创建失败");
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const newStatus = admin.status === "NORMAL" ? "DISABLED" : "NORMAL";
    try {
      await api.patch(`/admin/users/admins/${admin.id}/status`, { status: newStatus });
      fetchAdmins();
    } catch (e: any) {
      alert(e.message || "操作失败");
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>管理员管理</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {showCreate ? "取消" : "创建管理员"}
        </button>
      </div>

      {msg && <div style={{ padding: 8, background: "#e8f5e9", marginBottom: 12, borderRadius: 4 }}>{msg}</div>}

      {showCreate && (
        <div style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3>创建管理员</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="用户名" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={{ padding: "6px 12px" }} />
            <input type="password" placeholder="密码" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ padding: "6px 12px" }} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ padding: "6px 12px" }}>
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            <button onClick={handleCreate} style={{ padding: "6px 16px", cursor: "pointer", background: "#1976d2", color: "#fff", border: "none", borderRadius: 4 }}>
              创建
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 12, textAlign: "left" }}>用户名</th>
              <th style={{ padding: 12, textAlign: "left" }}>角色</th>
              <th style={{ padding: 12, textAlign: "left" }}>状态</th>
              <th style={{ padding: 12, textAlign: "left" }}>创建时间</th>
              <th style={{ padding: 12, textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 12 }}>{admin.username}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: admin.role === "SUPER_ADMIN" ? "#f44336" : admin.role === "ADMIN" ? "#ff9800" : "#4caf50", color: "#fff" }}>
                    {admin.role}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: admin.status === "NORMAL" ? "#4caf50" : "#9e9e9e", color: "#fff" }}>
                    {admin.status === "NORMAL" ? "正常" : "已停用"}
                  </span>
                </td>
                <td style={{ padding: 12 }}>{new Date(admin.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: 12 }}>
                  <button onClick={() => handleToggleStatus(admin)} style={{ padding: "4px 12px", cursor: "pointer", background: admin.status === "NORMAL" ? "#f44336" : "#4caf50", color: "#fff", border: "none", borderRadius: 4 }}>
                    {admin.status === "NORMAL" ? "停用" : "启用"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
