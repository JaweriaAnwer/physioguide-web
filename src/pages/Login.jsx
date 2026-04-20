import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/invalid-credential':
                return 'Invalid email or password. Please try again.';
            default:
                return 'Login failed. Please check your credentials.';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(getErrorMessage(err.code));
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
                        Sign in to your therapist dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label className="auth-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="input-field"
                                style={{ paddingLeft: 40 }}
                                id="login-email"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="auth-label">Password</label>
                            <Link to="/forgot-password" className="auth-link" style={{ fontSize: 12 }}>
                                Forgot password?
                            </Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                                style={{ paddingLeft: 40, paddingRight: 44 }}
                                id="login-password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--color-text-muted)',
                                    cursor: 'pointer', padding: 4, display: 'flex'
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
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
                        {loading ? (
                            <span className="auth-spinner" />
                        ) : (
                            <>Sign In <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="auth-divider">
                    <span>or</span>
                </div>

                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/signup" className="auth-link">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
