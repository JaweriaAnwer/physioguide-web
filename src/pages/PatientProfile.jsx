import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Target, Clock, Eye, Trash2, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getPatientById, getPatientSessions, deletePatientAndSessions } from '../utils/firebaseServices';
import { useAuth } from '../contexts/AuthContext';
import GenerateReportModal from '../components/GenerateReportModal';

export default function PatientProfile() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [patient, setPatient] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const patData = await getPatientById(currentUser.uid, patientId);
                if (patData) {
                    setPatient(patData);
                    const sessData = await getPatientSessions(patientId);
                    setSessions(sessData);
                }
            } catch (error) {
                console.error("Error loading patient profile:", error);
            } finally {
                setLoading(false);
            }
        };
        if (currentUser) loadData();
    }, [patientId, currentUser]);

    if (loading) {
        return <div style={{ textAlign: 'center', paddingTop: 80 }}>Loading Profile...</div>;
    }

    if (!patient) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: 80 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Patient Not Found</h2>
                <button className="btn-ghost" onClick={() => navigate('/')}>← Back to Dashboard</button>
            </div>
        );
    }

    // Generate progress data suitable for Recharts from real sessions
    const progressData = [...sessions]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(s => {
            const dateObj = new Date(s.timestamp);
            return {
                date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
                accuracy: s.accuracy,
            };
        });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to completely delete ${patient.full_name} and ALL their session data? This cannot be undone.`)) {
            setIsDeleting(true);
            try {
                await deletePatientAndSessions(currentUser.uid, patient.id);
                navigate('/');
            } catch (error) {
                console.error("Error deleting patient:", error);
                alert("Failed to delete patient. Please try again.");
                setIsDeleting(false);
            }
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '10px 14px', fontSize: 12 }}>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
                    <p style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>
                        Accuracy: {payload[0].value}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: 40 }} id="report-content-area">
            {/* Back Button + Actions */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
                <button className="btn-ghost" onClick={() => navigate('/')}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-ghost" onClick={() => setIsReportModalOpen(true)} style={{ color: 'var(--color-text-primary)' }}>
                        <Printer size={16} /> Generate Report
                    </button>
                    <button
                        className="btn-ghost"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{ color: 'var(--color-error)' }}
                    >
                        <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete Patient"}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: patient.status === 'critical'
                        ? 'linear-gradient(135deg, #f43f5e, #ef4444)'
                        : 'linear-gradient(135deg, #14b8a6, #22d3ee)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: '#fff',
                }}>
                    {patient.full_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 2 }}>{patient.full_name}</h2>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        <span>ID: {patient.id}</span>
                        <span>•</span>
                        <span>Plan: {patient.current_plan.join(', ')}</span>
                        <span>•</span>
                        <span>Compliance: <strong style={{ color: patient.compliance_rate >= 70 ? '#22c55e' : patient.compliance_rate >= 50 ? '#f59e0b' : '#ef4444' }}>{patient.compliance_rate}%</strong></span>
                    </div>
                </div>
            </div>

            {/* Progress Chart */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                    Accuracy Progress <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>— Last 30 Days</span>
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={progressData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} interval={4} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="accuracy" stroke="#22d3ee" strokeWidth={2} fill="url(#colorAccuracy)" dot={false} activeDot={{ r: 5, fill: '#22d3ee', strokeWidth: 0 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Session History */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-glass)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Session History</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Exercise</th>
                                <th>Reps</th>
                                <th>Duration</th>
                                <th>Accuracy</th>
                                <th>Errors</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((sess) => (
                                <tr key={sess.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                                            <div>
                                                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatDate(sess.timestamp)}</span>
                                                <br />
                                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatTime(sess.timestamp)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                            background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa',
                                            border: '1px solid rgba(139, 92, 246, 0.15)', textTransform: 'capitalize',
                                        }}>
                                            {sess.exercise.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Target size={14} style={{ color: 'var(--color-accent-teal)' }} />
                                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{sess.total_reps}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                                            <span>{sess.duration_sec}s</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700, fontSize: 14,
                                            color: sess.accuracy >= 80 ? '#22c55e' : sess.accuracy >= 60 ? '#f59e0b' : '#ef4444',
                                        }}>
                                            {sess.accuracy}%
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {!sess.error_flags || sess.error_flags.length === 0 ? (
                                                <span style={{ fontSize: 11, color: '#22c55e' }}>None</span>
                                            ) : (
                                                sess.error_flags.map((err) => (
                                                    <span key={err} className="badge-error">{err.replace('_', ' ')}</span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/session/${sess.id}`);
                                            }}
                                            style={{ fontSize: 12, padding: '5px 10px' }}
                                        >
                                            <Eye size={14} /> Replay
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <GenerateReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                patient={patient}
                sessions={sessions}
            />
        </div >
    );
}
