import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Mail, Lock, User, Stethoscope, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';

export default function SignUp() {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', specialization: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
        if (error) setError('');
    };

    const getPasswordStrength = (pw) => {
        if (!pw) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
        if (score <= 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
        if (score <= 3) return { level: 3, label: 'Good', color: '#22d3ee' };
        return { level: 4, label: 'Strong', color: '#22c55e' };
    };

    const strength = getPasswordStrength(formData.password);

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/email-already-in-use': return 'An account with this email already exists.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/weak-password': return 'Password must be at least 6 characters.';
            default: return 'Registration failed. Please try again.';
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { setError('Please enter your full name.'); return; }
        if (!formData.email.trim()) { setError('Please enter your email address.'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        setError('');
        try {
            await signup(formData.email, formData.password, formData.name.trim(), formData.specialization.trim());
            navigate('/');
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card animate-fade-in" style={{ maxWidth: 460 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(34, 211, 238, 0.25)' }}>
                        <Activity size={28} color="#0a0e1a" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Create Account</h1>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Register as a new therapist</p>
                </div>

                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="auth-label">Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input type="text" value={formData.name} onChange={handleChange('name')} placeholder="Dr. Jane Smith" className="input-field" style={{ paddingLeft: 40 }} id="signup-name" autoComplete="name" />
                        </div>
                    </div>
                    <div>
                        <label className="auth-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input type="email" value={formData.email} onChange={handleChange('email')} placeholder="you@example.com" className="input-field" style={{ paddingLeft: 40 }} id="signup-email" autoComplete="email" />
                        </div>
                    </div>
                    <div>
                        <label className="auth-label">Specialization <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                        <div style={{ position: 'relative' }}>
                            <Stethoscope size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input type="text" value={formData.specialization} onChange={handleChange('specialization')} placeholder="e.g. Orthopedic Rehabilitation" className="input-field" style={{ paddingLeft: 40 }} id="signup-specialization" />
                        </div>
                    </div>
                    <div>
                        <label className="auth-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange('password')} placeholder="Min. 6 characters" className="input-field" style={{ paddingLeft: 40, paddingRight: 44 }} id="signup-password" autoComplete="new-password" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {formData.password && (
                            <div style={{ marginTop: 8 }}>
                                <div className="password-strength-track">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="password-strength-segment" style={{ background: i <= strength.level ? strength.color : 'rgba(255,255,255,0.08)' }} />
                                    ))}
                                </div>
                                <p style={{ fontSize: 11, color: strength.color, marginTop: 4, fontWeight: 500 }}>{strength.label}</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="auth-label">Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Re-enter password" className="input-field" style={{ paddingLeft: 40, paddingRight: 44 }} id="signup-confirm-password" autoComplete="new-password" />
                            {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                <Check size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#22c55e' }} />
                            )}
                        </div>
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', marginTop: 4, fontSize: 15, opacity: loading ? 0.7 : 1 }} id="signup-submit">
                        {loading ? <span className="auth-spinner" /> : <>Create Account <ArrowRight size={18} /></>}
                    </button>
                </form>

                <div className="auth-divider"><span>or</span></div>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Already have an account?{' '}<Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
