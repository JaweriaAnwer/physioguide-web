import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Clock, Target, Zap, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import SkeletonCanvas from '../components/SkeletonCanvas';
import { generateMockRecording } from '../utils/mockData';
import { getSessionById } from '../utils/firebaseServices';

export default function SessionReview() {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [sessionData, setSessionData] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);

    // Fetch real session from Firebase
    useEffect(() => {
        const load = async () => {
            try {
                const sess = await getSessionById(sessionId);
                setSessionData(sess);
            } catch (err) {
                console.error('Failed to load session:', err);
            } finally {
                setLoadingSession(false);
            }
        };
        load();
    }, [sessionId]);

    // Build the recording object from real data or fall back to mock
    const recording = useMemo(() => {
        if (!sessionData) return generateMockRecording(120);

        // Unity stores the full per-frame recording as a JSON string in
        // the `recordingData` field.  Parse it if present.
        let parsedRecording = null;
        if (sessionData.recordingData) {
            try {
                parsedRecording = typeof sessionData.recordingData === 'string'
                    ? JSON.parse(sessionData.recordingData)
                    : sessionData.recordingData;
            } catch (e) {
                console.warn('recordingData JSON parse failed, using mock frames', e);
            }
        }

        // Build summary from the flat session fields
        const summary = {
            patient_id:    sessionData.patient_id   ?? 'unknown',
            patient_name:  sessionData.patient_name ?? sessionData.patient_id ?? 'Patient',
            exercise:      sessionData.exercise      ?? 'exercise',
            timestamp:     sessionData.timestamp     ?? new Date().toISOString(),
            duration_sec:  Number(sessionData.duration_sec)  || 0,
            total_reps:    Number(sessionData.total_reps)    || 0,
            total_frames:  Number(sessionData.total_frames)  || 0,
            accuracy:      Number(sessionData.accuracy)      || 0,
            error_flags_detected: Array.isArray(sessionData.error_flags)
                ? sessionData.error_flags
                : [],
        };

        // If Unity sent per-frame data, use it; otherwise generate mock frames
        const frames = parsedRecording?.Items ?? parsedRecording?.frames ?? null;
        if (frames && Array.isArray(frames) && frames.length > 0) {
            return { summary, frames };
        }

        // No per-frame data — generate mock frames but use real summary stats
        const mock = generateMockRecording(summary.total_frames || 120);
        return { summary, frames: mock.frames };
    }, [sessionData]);

    const summary = recording.summary;

    const [currentFrame, setCurrentFrame] = useState(0);
    const [currentFrameData, setCurrentFrameData] = useState(null);

    const handleFrameChange = useCallback((frameIdx, frameData) => {
        setCurrentFrame(frameIdx);
        setCurrentFrameData(frameData);
    }, []);

    // Build SEA (Shoulder Elevation Angle) chart data
    const seaData = useMemo(() => {
        return recording.frames.map((f, idx) => ({
            frame: idx,
            time: (idx / 30).toFixed(1),
            SEA: f.metrics.SEA,
            hasError: Object.values(f.error_flags).some(Boolean),
        }));
    }, [recording]);

    // Build error log
    const errorLog = useMemo(() => {
        const log = [];
        recording.frames.forEach((f, idx) => {
            const errors = Object.entries(f.error_flags).filter(([, v]) => v).map(([k]) => k);
            if (errors.length > 0) {
                const time = `${String(Math.floor(idx / 30 / 60)).padStart(2, '0')}:${String(Math.floor((idx / 30) % 60)).padStart(2, '0')}`;
                errors.forEach((err) => {
                    // Avoid duplicate consecutive entries
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
        return <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--color-text-muted)' }}>Loading Session...</div>;
    }

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
                            <span>{summary.patient_name}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{summary.exercise}</span>
                            <span>•</span>
                            <span>{new Date(summary.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Session Stats */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        {[
                            { icon: Target, label: 'Accuracy', value: `${summary.accuracy}%`, color: summary.accuracy >= 80 ? '#22c55e' : '#f59e0b' },
                            { icon: Clock, label: 'Duration', value: `${summary.duration_sec}s`, color: '#22d3ee' },
                            { icon: Zap, label: 'Reps', value: summary.total_reps, color: '#8b5cf6' },
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
                    {currentFrameData && (
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
                                            {typeof val === 'number' ? val.toFixed(1) : val}
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
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
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
