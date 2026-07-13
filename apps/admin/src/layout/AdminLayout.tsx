import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const adminStr = localStorage.getItem("admin");
  const admin = adminStr ? JSON.parse(adminStr) : null;

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin");
    navigate("/login");
  };

  const menuItems = [
    { key: "/", label: "仪表盘", icon: "📊" },
    { key: "/users", label: "用户管理", icon: "👥" },
    { key: "/admins", label: "管理员", icon: "🔐", roles: ["SUPER_ADMIN", "ADMIN"] },
    { key: "/ledger-games", label: "记账管理", icon: "📒" },
    { key: "/practice-rooms", label: "练习房", icon: "🎮" },
    { key: "/practice-hands", label: "手牌记录", icon: "🃏" },
    { key: "/risk-logs", label: "风控日志", icon: "⚠️" },
    { key: "/audit-logs", label: "审计日志", icon: "📋", roles: ["SUPER_ADMIN", "ADMIN"] },
    { key: "/system-config", label: "系统配置", icon: "⚙️" },
    { key: "/events", label: "埋点事件", icon: "📈", roles: ["SUPER_ADMIN", "ADMIN"] },
  ];

  const filteredItems = menuItems.filter(
    (item) => !item.roles || (admin && item.roles.includes(admin.role))
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: collapsed ? 60 : 200,
          background: "#1a1a2e",
          color: "#fff",
          transition: "width 0.2s",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {!collapsed && <strong>ALLINLE 管理</strong>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {filteredItems.map((item) => (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                background:
                  location.pathname === item.key
                    ? "rgba(255,255,255,0.15)"
                    : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          ))}
        </nav>
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: 12,
          }}
        >
          {!collapsed && (
            <>
              <div>{admin?.username}</div>
              <div style={{ opacity: 0.7 }}>{admin?.role}</div>
            </>
          )}
          <button
            onClick={handleLogout}
            style={{
              marginTop: 8,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 4,
              cursor: "pointer",
              width: "100%",
            }}
          >
            {collapsed ? "🚪" : "退出"}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 24, background: "#f5f5f5" }}>
        <Outlet />
      </main>
    </div>
  );
}
