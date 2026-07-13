import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { LedgerGamesPage } from "./pages/LedgerGamesPage";
import { PracticeRoomsPage } from "./pages/PracticeRoomsPage";
import { PracticeHandsPage } from "./pages/PracticeHandsPage";
import { RiskLogsPage } from "./pages/RiskLogsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { SystemConfigPage } from "./pages/SystemConfigPage";
import { TeamLedgerPage } from "./pages/TeamLedgerPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
          <Route path="ledger-games" element={<LedgerGamesPage />} />
          <Route path="practice-rooms" element={<PracticeRoomsPage />} />
          <Route path="practice-hands" element={<PracticeHandsPage />} />
          <Route path="risk-logs" element={<RiskLogsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="system-config" element={<SystemConfigPage />} />
          <Route path="team-ledger" element={<TeamLedgerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
