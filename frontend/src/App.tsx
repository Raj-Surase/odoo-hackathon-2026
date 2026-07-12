import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/modules/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/modules/auth/LoginPage';
import RegisterPage from '@/modules/auth/RegisterPage';

// Simple Premium styled Page Placeholders for routing validation
const Dashboard = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time operational snapshot of corporate assets.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-soft">
        <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Assets</h3>
        <p className="text-3xl font-extrabold text-white mt-2">1,248</p>
      </div>
      <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-soft">
        <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Active Bookings</h3>
        <p className="text-3xl font-extrabold text-white mt-2">42</p>
      </div>
      <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-soft">
        <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Pending Audits</h3>
        <p className="text-3xl font-extrabold text-white mt-2">3</p>
      </div>
    </div>
  </div>
);

import SetupPage from '@/modules/setup/SetupPage';
import AssetsPage from '@/modules/assets/AssetsPage';
import AllocationsPage from '@/modules/allocations/AllocationsPage';
import { useAuth } from '@/modules/auth/AuthContext';

// Admin-Only Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};



const Bookings = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-soft">
    <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Resource Booking</h1>
    <p className="text-muted-foreground text-sm">Reserve conference rooms, project tools, or vehicles.</p>
  </div>
);

const Maintenance = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-soft">
    <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Maintenance</h1>
    <p className="text-muted-foreground text-sm">Raise requests, assign technicians, and track resolution.</p>
  </div>
);

const Audits = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-soft">
    <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Asset Audits</h1>
    <p className="text-muted-foreground text-sm">Periodic verification cycles and discrepancy reports.</p>
  </div>
);

const Reports = () => (
  <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-soft">
    <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Reports & Analytics</h1>
    <p className="text-muted-foreground text-sm">Lifecycle depreciation, utilization, and cost analytics.</p>
  </div>
);

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
            <Route index element={<Dashboard />} />
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
            <Route path="bookings" element={<Bookings />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="audits" element={<Audits />} />
            <Route path="reports" element={<Reports />} />
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
