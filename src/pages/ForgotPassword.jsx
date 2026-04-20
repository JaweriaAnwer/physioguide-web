import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPassword() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/user-not-found': return 'No account found with this email address.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
            default: return 'Failed to send reset email. Please try again.';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        setLoading(true);
        setError('');
        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card animate-fade-in" style={{ maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(34, 211, 238, 0.25)' }}>
                        <Activity size={28} color="#0a0e1a" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Reset Password</h1>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                        {success ? 'Check your inbox for the reset link' : 'Enter your email to receive a reset link'}
                    </p>
                </div>

                {success ? (
                    <div className="animate-fade-in">
                        <div className="auth-success">
                            <Send size={20} style={{ marginBottom: 8 }} />
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>Email Sent!</p>
                            <p style={{ fontSize: 13, opacity: 0.85 }}>
                                We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
                            </p>
                        </div>
                        <Link to="/login" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 15, marginTop: 24, textDecoration: 'none' }}>
                            <ArrowLeft size={18} /> Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label className="auth-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className="input-field" style={{ paddingLeft: 40 }} id="forgot-email" autoComplete="email" />
                            </div>
                        </div>
                        {error && <div className="auth-error">{error}</div>}
                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 15, opacity: loading ? 0.7 : 1 }} id="forgot-submit">
                            {loading ? <span className="auth-spinner" /> : <>Send Reset Link <Send size={16} /></>}
                        </button>
                        <Link to="/login" style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ArrowLeft size={14} /> Back to Sign In
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
