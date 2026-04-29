import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, Bell, Shield, Moon, Sun } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Settings() {
    const { currentUser, therapistProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile State
    const [name, setName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Preferences State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
    });
    const [emailNotifications, setEmailNotifications] = useState(true);

    useEffect(() => {
        if (therapistProfile) {
            setName(therapistProfile.name || '');
            setSpecialization(therapistProfile.specialization || '');
        }
    }, [therapistProfile]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');
        try {
            const therapistRef = doc(db, 'therapists', currentUser.uid);
            await updateDoc(therapistRef, {
                name,
                specialization
            });
            setSaveMessage('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            setSaveMessage('Failed to update profile.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const toggleTheme = () => {
        const newIsDark = !isDarkMode;
        setIsDarkMode(newIsDark);
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
        if (newIsDark) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: 40, maxWidth: 800 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Settings</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 32 }}>
                Manage your profile, preferences, and account settings.
            </p>

            <div style={{ display: 'flex', gap: 32 }}>
                {/* Sidebar Tabs */}
                <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button 
                        className={`btn-ghost ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                        style={{ justifyContent: 'flex-start', padding: '12px 16px', background: activeTab === 'profile' ? 'var(--color-bg-secondary)' : 'transparent' }}
                    >
                        <User size={18} style={{ marginRight: 8 }} /> Profile
                    </button>
                    <button 
                        className={`btn-ghost ${activeTab === 'preferences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preferences')}
                        style={{ justifyContent: 'flex-start', padding: '12px 16px', background: activeTab === 'preferences' ? 'var(--color-bg-secondary)' : 'transparent' }}
                    >
                        <Bell size={18} style={{ marginRight: 8 }} /> Preferences
                    </button>
                    <button 
                        className={`btn-ghost ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                        style={{ justifyContent: 'flex-start', padding: '12px 16px', background: activeTab === 'security' ? 'var(--color-bg-secondary)' : 'transparent' }}
                    >
                        <Shield size={18} style={{ marginRight: 8 }} /> Security
                    </button>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1 }}>
                    {activeTab === 'profile' && (
                        <div className="glass-card animate-slide-in">
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Profile Information</h3>
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Full Name
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Specialization
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        value={specialization}
                                        onChange={(e) => setSpecialization(e.target.value)}
                                        placeholder="e.g., Senior Physiotherapist"
                                    />
                                </div>
                                
                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <button type="submit" className="btn-primary" disabled={isSaving}>
                                        <Save size={16} />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    {saveMessage && (
                                        <span style={{ fontSize: 13, color: saveMessage.includes('success') ? '#22c55e' : '#ef4444' }}>
                                            {saveMessage}
                                        </span>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="glass-card animate-slide-in">
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>App Preferences</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--color-border-glass)' }}>
                                <div>
                                    <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Dark Mode</h4>
                                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Toggle application dark mode appearance.</p>
                                </div>
                                <button 
                                    className="btn-ghost" 
                                    onClick={toggleTheme}
                                    style={{ padding: 8, background: 'var(--color-bg-secondary)' }}
                                >
                                    {isDarkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#64748b" />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                                <div>
                                    <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Email Notifications</h4>
                                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Receive summaries when patients complete sessions.</p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={emailNotifications} 
                                        onChange={() => setEmailNotifications(!emailNotifications)} 
                                        style={{ width: 18, height: 18, accentColor: 'var(--color-accent-blue)' }}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="glass-card animate-slide-in">
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Security Settings</h3>
                            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                                Password changes are handled securely via Firebase Authentication. 
                                To change your password, please sign out and use the "Forgot Password" flow, or contact support.
                            </p>
                            <button className="btn-ghost" disabled style={{ opacity: 0.5 }}>
                                Change Password (Coming Soon)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
