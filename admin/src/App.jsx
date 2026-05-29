import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SubjectsPage from "./pages/SubjectsPage";
import SubjectDetailPage from "./pages/SubjectDetailPage";
import UploadSubjectPage from "./pages/UploadSubjectPage";
import ProcessingTrackerPage from "./pages/ProcessingTrackerPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AppShell from "./components/AppShell";

function ProtectedRoute({ children }) {
  const { token, admin, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="screen-center">Loading admin session...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (admin?.mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/upload" element={<UploadSubjectPage />} />
        <Route path="processing-tracker" element={<ProcessingTrackerPage />} />
        <Route path="subjects/:id" element={<SubjectDetailPage />} />
        <Route path="admin-users" element={<AdminUsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
