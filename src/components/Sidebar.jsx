import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Activity,
} from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // For demo: just navigate to login
        navigate('/login');
    };

    const links = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/patients', icon: Users, label: 'Patients' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="sidebar" style={{ width: 260, minHeight: '100vh', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', marginBottom: 40 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Activity size={22} color="#0a0e1a" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                        PhysioGuide
                    </h1>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
                        THERAPIST PORTAL
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Therapist Info + Logout */}
            <div style={{ borderTop: '1px solid var(--color-border-glass)', paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', marginBottom: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #14b8a6, #22d3ee)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#0a0e1a',
                    }}>
                        DW
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Dr. Wasi</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>NCCI Karachi</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="sidebar-link"
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
