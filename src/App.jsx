import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import DashboardHome from './pages/DashboardHome';
import PatientProfile from './pages/PatientProfile';
import SessionReview from './pages/SessionReview';

function ProtectedLayout({ children }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" replace />;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
                {children}
            </main>
        </div>
    );
}

function PublicRoute({ children }) {
    const { currentUser } = useAuth();
    if (currentUser) return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
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
