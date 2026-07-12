import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/modules/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/modules/auth/LoginPage';
import RegisterPage from '@/modules/auth/RegisterPage';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import ReportsPage from '@/modules/reports/ReportsPage';
import SetupPage from '@/modules/setup/SetupPage';
import AssetsPage from '@/modules/assets/AssetsPage';
import AllocationsPage from '@/modules/allocations/AllocationsPage';
import BookingsPage from '@/modules/bookings/BookingsPage';
import MaintenancePage from '@/modules/maintenance/MaintenancePage';
import AuditsPage from '@/modules/audits/AuditsPage';
import { useAuth } from '@/modules/auth/AuthContext';

// Admin-Only Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Placeholders for remaining routing validation
const Notifications = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-soft">
    <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Notifications</h1>
    <p className="text-muted-foreground text-sm">System notifications, approval alerts, and audit logs.</p>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Main Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route 
              path="setup" 
              element={
                <AdminRoute>
                  <SetupPage />
                </AdminRoute>
              } 
            />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="allocations" element={<AllocationsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="audits" element={<AuditsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<Notifications />} />
            
            {/* Catch-all Redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
