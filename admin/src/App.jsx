import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import OfficersPage from './pages/OfficersPage';
import SOSPage from './pages/SOSPage';
import IncidentsPage from './pages/IncidentsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import SchemesPage from './pages/SchemesPage';
import PricesPage from './pages/PricesPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogsPage from './pages/AuditLogsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading KadalThunai Admin...</span>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<DashboardPage />} />
        <Route path="users"         element={<UsersPage />} />
        <Route path="officers"      element={<OfficersPage />} />
        <Route path="sos"           element={<SOSPage />} />
        <Route path="incidents"     element={<IncidentsPage />} />
        <Route path="complaints"    element={<ComplaintsPage />} />
        <Route path="schemes"       element={<SchemesPage />} />
        <Route path="prices"        element={<PricesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit-logs"    element={<AuditLogsPage />} />
        <Route path="*"             element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
