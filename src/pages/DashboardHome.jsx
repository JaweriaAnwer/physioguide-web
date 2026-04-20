import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, TrendingUp, AlertTriangle, Search, ChevronUp, ChevronDown, Plus, X, Copy, Check, Download } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { getPatients, createPatient, getGlobalPatients, migrateGlobalPatientsToTherapist } from '../utils/firebaseServices';

export default function DashboardHome() {
    const navigate = useNavigate();
    const { currentUser, therapistProfile } = useAuth();
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('full_name');
    const [sortDir, setSortDir] = useState('asc');

    // Add Patient Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPatient, setNewPatient] = useState({ name: '', plan: '' });
    const [generatedKey, setGeneratedKey] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Real Data State
    const [localPatients, setLocalPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Migration State
    const [showMigration, setShowMigration] = useState(false);
    const [globalPatientCount, setGlobalPatientCount] = useState(0);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationDone, setMigrationDone] = useState(false);

    const therapistName = therapistProfile?.name || 'Therapist';

    // Fetch from Firebase (therapist-scoped)
    const loadPatients = async () => {
        try {
            setLoading(true);
            const data = await getPatients(currentUser.uid);
            setLocalPatients(data);

            // If no patients, check for legacy global patients to migrate
            if (data.length === 0) {
                const globalPatients = await getGlobalPatients();
                if (globalPatients.length > 0) {
                    setGlobalPatientCount(globalPatients.length);
                    setShowMigration(true);
                }
            }
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) loadPatients();
    }, [currentUser]);

    const handleMigrate = async () => {
        setIsMigrating(true);
        try {
            const result = await migrateGlobalPatientsToTherapist(currentUser.uid, therapistName);
            setMigrationDone(true);
            // Reload patients
            const data = await getPatients(currentUser.uid);
            setLocalPatients(data);
            setTimeout(() => {
                setShowMigration(false);
                setMigrationDone(false);
            }, 3000);
        } catch (error) {
            console.error("Migration failed:", error);
            alert("Migration failed. Please try again.");
        } finally {
            setIsMigrating(false);
        }
    };

    // Compute stats
    const totalPatients = localPatients.length;
    const activeToday = localPatients.filter((p) => {
        const lastActive = new Date(p.last_active);
        const today = new Date();
        return lastActive.toDateString() === today.toDateString();
    }).length;

    const avgCompliance = useMemo(() => {
        if (localPatients.length === 0) return 0;
        const sum = localPatients.reduce((a, p) => a + p.compliance_rate, 0);
        return Math.round(sum / localPatients.length * 10) / 10;
    }, [localPatients]);

    const criticalAlerts = localPatients.filter((p) => p.compliance_rate < 50).length;

    // Filter + Sort patients
    const filteredPatients = useMemo(() => {
        let list = [...localPatients];
        if (search) {
            list = list.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()));
        }
        list.sort((a, b) => {
            let va = a[sortField];
            let vb = b[sortField];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }, [localPatients, search, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleCreatePatient = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        const key = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            await createPatient(currentUser.uid, newPatient, key, therapistName);
            const patientObj = {
                id: `pat_${key}`,
                full_name: newPatient.name,
                assigned_therapist: therapistName,
                current_plan: newPatient.plan.split(',').map(s => s.trim()),
                last_active: new Date().toISOString(),
                compliance_rate: 100,
                status: 'active',
                unique_key: key
            };
            setLocalPatients(prev => [patientObj, ...prev]);
            setGeneratedKey(key);
        } catch (error) {
            console.error("Error creating patient:", error);
            alert("Failed to create patient. Check your internet connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeAndResetModal = () => {
        setIsModalOpen(false);
        setGeneratedKey(null);
        setNewPatient({ name: '', plan: '' });
    };

    return (
        <div className="animate-fade-in">
            {/* Migration Banner */}
            {showMigration && (
                <div className="migration-banner animate-fade-in" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <Download size={20} style={{ color: 'var(--color-accent-cyan)', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                {migrationDone ? 'Migration Complete!' : `Found ${globalPatientCount} patient(s) from previous database`}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                {migrationDone ? 'Your patients have been imported successfully.' : 'Import them into your account to continue managing their data.'}
                            </p>
                        </div>
                    </div>
                    {!migrationDone && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" onClick={handleMigrate} disabled={isMigrating} style={{ padding: '8px 16px', fontSize: 13 }}>
                                {isMigrating ? 'Migrating...' : 'Import Patients'}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowMigration(false)} style={{ padding: '8px 12px', fontSize: 13 }}>
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Command Center</h2>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                        Welcome back, <span style={{ color: 'var(--color-accent-cyan)' }}>{therapistName}</span> — monitor patient progress and compliance
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> Add New Patient
                </button>
            </div>

            {/* Stats Row */}
            <div className="stagger-children" style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                <StatCard icon={Users} label="Total Patients" value={loading ? "..." : totalPatients} subtitle="Enrolled" gradient="cyan" />
                <StatCard icon={Activity} label="Active Today" value={loading ? "..." : activeToday} subtitle="Sessions completed" gradient="teal" />
                <StatCard icon={TrendingUp} label="Avg Compliance" value={loading ? "..." : `${avgCompliance}%`} subtitle="Across all patients" gradient="violet" />
                <StatCard icon={AlertTriangle} label="Critical Alerts" value={loading ? "..." : criticalAlerts} subtitle="Below 50% compliance" gradient="rose" />
            </div>

            {/* Patient List */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Patient Overview</h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="input-field" style={{ paddingLeft: 36, width: 240, padding: '8px 12px 8px 36px' }} id="patient-search" />
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Name <SortIcon field="full_name" /></span>
                                </th>
                                <th>Plan</th>
                                <th onClick={() => handleSort('last_active')} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Last Active <SortIcon field="last_active" /></span>
                                </th>
                                <th onClick={() => handleSort('compliance_rate')} style={{ cursor: 'pointer' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Compliance <SortIcon field="compliance_rate" /></span>
                                </th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id} onClick={() => navigate(`/patient/${patient.id}`)} id={`patient-row-${patient.id}`}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: patient.status === 'critical'
                                                    ? 'linear-gradient(135deg, #f43f5e, #ef4444)'
                                                    : 'linear-gradient(135deg, #14b8a6, #22d3ee)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700, color: '#fff',
                                            }}>
                                                {patient.full_name.split(' ').map((n) => n[0]).join('')}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{patient.full_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {patient.current_plan.map((ex) => (
                                                <span key={ex} style={{
                                                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                                                    background: 'rgba(34, 211, 238, 0.08)', color: 'var(--color-accent-cyan)',
                                                    border: '1px solid rgba(34, 211, 238, 0.15)',
                                                }}>{ex}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>{formatDate(patient.last_active)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="compliance-bar" style={{ width: 80 }}>
                                                <div className="compliance-bar-fill" style={{
                                                    width: `${patient.compliance_rate}%`,
                                                    background: patient.compliance_rate >= 70
                                                        ? 'linear-gradient(90deg, #14b8a6, #22c55e)'
                                                        : patient.compliance_rate >= 50
                                                            ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                                                            : 'linear-gradient(90deg, #ef4444, #f43f5e)',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                {patient.compliance_rate}%
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${patient.status === 'critical' ? 'badge-critical' : 'badge-active'}`}>
                                            {patient.status === 'critical' ? '● Critical' : '● Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Patient Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="glass-card animate-fade-in" style={{ width: 400, padding: 24, position: 'relative', background: 'var(--color-bg-secondary)' }}>
                        <button onClick={closeAndResetModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                        {!generatedKey ? (
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Register New Patient</h3>
                                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                                    Creates a profile and generates a unique login key for Unity.
                                </p>
                                <form onSubmit={handleCreatePatient} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Full Name</label>
                                        <input required type="text" placeholder="e.g. John Doe" className="input-field" value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Treatment Plan (comma separated)</label>
                                        <input required type="text" placeholder="e.g. Scaption, Chin Tuck" className="input-field" value={newPatient.plan} onChange={e => setNewPatient({ ...newPatient, plan: e.target.value })} />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={isSubmitting}>
                                        {isSubmitting ? "Generating..." : "Generate Unique Key"}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <Check size={28} color="#22c55e" />
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Patient Added Successfully!</h3>
                                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                                    Give this Unique Key to <strong>{newPatient.name}</strong> to enter into the Unity VR app.
                                </p>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed var(--color-border-glass)' }}>
                                    <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--color-accent-cyan)' }}>{generatedKey}</span>
                                    <button onClick={copyToClipboard} className="btn-ghost" style={{ padding: '8px 12px' }}>
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 24, background: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 8 }}>
                                    This key acts as their login credential and database link. All their VR sessions will sync to this profile.
                                </p>
                                <button onClick={closeAndResetModal} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
