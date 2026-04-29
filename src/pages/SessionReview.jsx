import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Clock, Target, Zap, Printer, WifiOff, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import SkeletonCanvas from '../components/SkeletonCanvas';
import { findSessionAcrossPatients, fetchRecordingData } from '../utils/firebaseServices';
import { useAuth } from '../contexts/AuthContext';

export default function SessionReview() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [sessionData, setSessionData] = useState(null);
    const [patientName, setPatientName] = useState('Patient');
    const [loadingSession, setLoadingSession] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [recordingFrames, setRecordingFrames] = useState(null);
    const [loadingRecording, setLoadingRecording] = useState(false);

    // Fetch real session from Firebase nested subcollection
    useEffect(() => {
        const load = async () => {
            if (!currentUser) return;
            try {
                const result = await findSessionAcrossPatients(currentUser.uid, sessionId);
                if (result) {
                    setSessionData(result.session);
                    setPatientName(result.patientName);
                } else {
                    setNotFound(true);
                }
            } catch (err) {
                console.error('Failed to load session:', err);
                setNotFound(true);
            } finally {
                setLoadingSession(false);
            }
        };
        load();
    }, [sessionId, currentUser]);

    // Fetch recording data from Firebase Storage when recording_url is available
    useEffect(() => {
        if (!sessionData?.recording_url) return;

        const loadRecording = async () => {
            setLoadingRecording(true);
            try {
                const frames = await fetchRecordingData(sessionData.recording_url);
                if (frames && frames.length > 0) {
                    setRecordingFrames(frames);
                }
            } catch (err) {
                console.error('Failed to load recording:', err);
            } finally {
                setLoadingRecording(false);
            }
        };

        loadRecording();
    }, [sessionData?.recording_url]);

    // Build the recording object from real Firebase data
    const recording = useMemo(() => {
        if (!sessionData) return null;

        // Prefer frames fetched from Firebase Storage, then inline recordingData
        const frames = recordingFrames
            ?? (Array.isArray(sessionData.recordingData) && sessionData.recordingData.length > 0
                ? sessionData.recordingData
                : null);

        const summary = {
            patient_id:   sessionData.patient_id   ?? 'unknown',
            patient_name: patientName,
            exercise:     sessionData.exercise      ?? 'exercise',
            timestamp:    sessionData.timestamp     ?? new Date().toISOString(),
            duration_sec: Number(sessionData.duration_sec)  || 0,
            total_reps:   Number(sessionData.total_reps)    || 0,
            accuracy:     Number(sessionData.accuracy)      || 0,
            error_flags_detected: Array.isArray(sessionData.error_flags) ? sessionData.error_flags : [],
        };

        return { summary, frames };
    }, [sessionData, patientName, recordingFrames]);

    const [currentFrame, setCurrentFrame] = useState(0);
    const [currentFrameData, setCurrentFrameData] = useState(null);

    const handleFrameChange = useCallback((frameIdx, frameData) => {
        setCurrentFrame(frameIdx);
        setCurrentFrameData(frameData);
    }, []);

    // Build SEA chart data from real frame metrics
    const seaData = useMemo(() => {
        if (!recording?.frames) return [];
        return recording.frames.map((f, idx) => ({
            frame: idx,
            time: (idx / 30).toFixed(1),
            SEA: Number(f?.metrics?.SEA) || 0,
            hasError: f?.error_flags
                ? Object.values(f.error_flags).some(Boolean)
                : false,
        }));
    }, [recording]);

    // Build error log from real frame error_flags
    const errorLog = useMemo(() => {
        if (!recording?.frames) return [];
        const log = [];
        recording.frames.forEach((f, idx) => {
            if (!f?.error_flags) return;
            const errors = Object.entries(f.error_flags)
                .filter(([, v]) => v === true)
                .map(([k]) => k);
            if (errors.length > 0) {
                const time = `${String(Math.floor(idx / 30 / 60)).padStart(2, '0')}:${String(Math.floor((idx / 30) % 60)).padStart(2, '0')}`;
                errors.forEach((err) => {
                    const lastEntry = log[log.length - 1];
                    if (!lastEntry || lastEntry.error !== err || idx - lastEntry.frameIdx > 5) {
                        log.push({ frameIdx: idx, time, error: err, label: err.replace(/_/g, ' ') });
                    }
                });
            }
        });
        return log;
    }, [recording]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="glass-card" style={{ padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Time: {d.time}s</p>
                    <p style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>SEA: {d.SEA.toFixed(1)}°</p>
                    {d.hasError && <p style={{ color: '#ef4444', fontSize: 11 }}>⚠ Error detected</p>}
                </div>
            );
        }
        return null;
    };

    if (loadingSession) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--color-text-muted)' }}>
                <div style={{ marginBottom: 12, fontSize: 32 }}>⏳</div>
                Loading Session...
            </div>
        );
    }

    if (notFound || !sessionData) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: 80 }}>
                <WifiOff size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 16 }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Session Not Found</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: 14 }}>
                    No session data available for this session ID.
                </p>
                <button className="btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
            </div>
        );
    }

    // No per-frame recording data stored — check if still loading from Storage
    if (!recording?.frames) {
        // Show loading state if recording is being fetched from Firebase Storage
        if (loadingRecording) {
            return (
                <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: 80 }}>
                    <Loader size={32} className="animate-spin" style={{ color: 'var(--color-accent-cyan)', marginBottom: 16 }} />
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                        Downloading session recording from cloud...
                    </p>
                </div>
            );
        }

        const summary = recording?.summary;
        return (
            <div className="animate-fade-in">
                <div style={{ marginBottom: 24 }}>
                    <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Session Summary</h2>
                    <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        <span>{patientName}</span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>{summary?.exercise?.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{summary?.timestamp ? new Date(summary.timestamp).toLocaleDateString() : '—'}</span>
                    </div>
                </div>

                {/* Session Stats */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    {[
                        { icon: Target, label: 'Accuracy', value: `${summary?.accuracy ?? 0}%`, color: (summary?.accuracy ?? 0) >= 80 ? '#22c55e' : '#f59e0b' },
                        { icon: Clock,  label: 'Duration', value: `${summary?.duration_sec ?? 0}s`, color: '#22d3ee' },
                        { icon: Zap,    label: 'Reps',     value: summary?.total_reps ?? 0, color: '#8b5cf6' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="glass-card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Icon size={16} style={{ color }} />
                            <div>
                                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</p>
                                <p style={{ fontSize: 16, fontWeight: 700, color }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error Flags */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={16} style={{ color: '#ef4444' }} />
                        Compensation Flags Detected
                    </h4>
                    {summary?.error_flags_detected?.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#22c55e' }}>No compensation errors detected ✓</p>
                    ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {summary?.error_flags_detected?.map(err => (
                                <span key={err} className="badge-error" style={{ textTransform: 'capitalize' }}>
                                    {err.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card" style={{ padding: 24, marginTop: 16, textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        Frame-by-frame replay is not available — no per-frame recording data was uploaded for this session.
                        {sessionData?.recording_url && ' (Download may have failed — try refreshing the page.)'}
                    </p>
                </div>
            </div>
        );
    }

    const summary = recording.summary;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }} className="no-print">
                    <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <button className="btn-ghost" onClick={() => window.print()} style={{ marginBottom: 16, color: 'var(--color-text-primary)' }}>
                        <Printer size={16} /> Generate Report
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Session Analyzer</h2>
                        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                            <span>{patientName}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{summary.exercise.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span>{new Date(summary.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Session Stats */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        {[
                            { icon: Target, label: 'Accuracy', value: `${summary.accuracy}%`, color: summary.accuracy >= 80 ? '#22c55e' : '#f59e0b' },
                            { icon: Clock,  label: 'Duration', value: `${summary.duration_sec}s`, color: '#22d3ee' },
                            { icon: Zap,    label: 'Reps',     value: summary.total_reps, color: '#8b5cf6' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="glass-card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon size={16} style={{ color }} />
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</p>
                                    <p style={{ fontSize: 16, fontWeight: 700, color }}>{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Split Screen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                {/* Left: Skeleton Replay */}
                <SkeletonCanvas recording={recording} onFrameChange={handleFrameChange} />

                {/* Right: Telemetry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* SEA Graph */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                            Shoulder Elevation Angle (SEA)
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                                over time
                            </span>
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={seaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Time (s)', position: 'bottom', fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 180]} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={currentFrameData?.metrics?.SEA || 0} stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="SEA" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Metrics Panel */}
                    {currentFrameData?.metrics && (
                        <div className="glass-card" style={{ padding: 20 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Frame Metrics</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                {Object.entries(currentFrameData.metrics).map(([key, val]) => (
                                    <div key={key} style={{
                                        padding: '8px 12px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-glass)',
                                    }}>
                                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{key}</p>
                                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-cyan)' }}>
                                            {typeof val === 'number' ? val.toFixed(3) : val}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Log */}
                    <div className="glass-card" style={{ padding: 20, maxHeight: 240, overflowY: 'auto' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle size={16} style={{ color: '#ef4444' }} />
                            Error Log
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>
                                ({errorLog.length} events)
                            </span>
                        </h4>
                        {errorLog.length === 0 ? (
                            <p style={{ fontSize: 13, color: '#22c55e' }}>No errors detected ✓</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {errorLog.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                                            borderRadius: 8, fontSize: 12,
                                            background: currentFrame === entry.frameIdx ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                            cursor: 'pointer', transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
                                        onMouseLeave={(e) => {
                                            if (currentFrame !== entry.frameIdx) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', minWidth: 40 }}>
                                            {entry.time}
                                        </span>
                                        <span style={{ color: '#fca5a5', textTransform: 'capitalize' }}>
                                            {entry.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
