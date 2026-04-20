import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Demo mode: accept any credentials
        // In production, replace with Firebase Auth:
        // import { signInWithEmailAndPassword } from 'firebase/auth';
        // import { auth } from '../utils/firebase';
        // await signInWithEmailAndPassword(auth, email, password);

        try {
            await new Promise((r) => setTimeout(r, 800)); // Simulate network
            if (email && password) {
                localStorage.setItem('physioguide_auth', 'true');
                localStorage.setItem('physioguide_user', email);
                navigate('/');
            } else {
                setError('Please enter email and password.');
            }
        } catch {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card animate-fade-in">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(34, 211, 238, 0.25)',
                    }}>
                        <Activity size={32} color="#0a0e1a" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                        PhysioGuide
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                        Therapist Dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="dr.wasi@physioguide.com"
                                className="input-field"
                                style={{ paddingLeft: 40 }}
                                id="login-email"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                                style={{ paddingLeft: 40 }}
                                id="login-password"
                            />
                        </div>
                    </div>

                    {error && (
                        <p style={{ fontSize: 13, color: 'var(--color-danger)', textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%', justifyContent: 'center', padding: '14px 20px',
                            marginTop: 8, fontSize: 15, opacity: loading ? 0.7 : 1,
                        }}
                        id="login-submit"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 24 }}>
                    Demo: enter any email & password to sign in
                </p>
            </div>
        </div>
    );
}
