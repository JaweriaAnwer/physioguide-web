import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import PatientProfile from './pages/PatientProfile';
import SessionReview from './pages/SessionReview';

function ProtectedLayout({ children }) {
  const isAuth = localStorage.getItem('physioguide_auth') === 'true';
  if (!isAuth) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <DashboardHome />
          </ProtectedLayout>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedLayout>
            <DashboardHome />
          </ProtectedLayout>
        }
      />
      <Route
        path="/patient/:patientId"
        element={
          <ProtectedLayout>
            <PatientProfile />
          </ProtectedLayout>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedLayout>
            <SessionReview />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <div className="animate-fade-in">
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Settings</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Settings will be available in a future update.</p>
            </div>
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
