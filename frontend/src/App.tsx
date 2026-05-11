import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ArchivePage } from "./pages/ArchivePage";
import { BriefingDetailPage } from "./pages/BriefingDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/briefings/:date" element={<BriefingDetailPage />} />
        {/* Placeholder routes for sidebar items not built yet — redirect to dashboard. */}
        <Route path="/markets" element={<Navigate to="/" replace />} />
        <Route path="/calendar" element={<Navigate to="/" replace />} />
        <Route path="/regime" element={<Navigate to="/" replace />} />
        <Route path="/vol" element={<Navigate to="/" replace />} />
        <Route path="/themes" element={<Navigate to="/" replace />} />
        <Route path="/positioning" element={<Navigate to="/" replace />} />
        <Route path="/correlations" element={<Navigate to="/" replace />} />
        <Route path="/notes" element={<Navigate to="/" replace />} />
        <Route path="/reports" element={<Navigate to="/" replace />} />
        <Route path="/pnl" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
