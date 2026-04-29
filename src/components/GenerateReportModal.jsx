import { useState, useRef } from 'react';
import { FileText, Calendar, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function GenerateReportModal({ isOpen, onClose, patient, sessions }) {
    const [reportType, setReportType] = useState('all'); // 'all', 'single', 'range'
    const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || '');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    
    const printRef = useRef(null);

    if (!isOpen) return null;

    // Filter sessions based on selection
    let filteredSessions = sessions;
    if (reportType === 'single' && selectedSessionId) {
        filteredSessions = sessions.filter(s => s.id === selectedSessionId);
    } else if (reportType === 'range' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        filteredSessions = sessions.filter(s => {
            const d = new Date(s.timestamp);
            return d >= start && d <= end;
        });
    }

    // Calculations for the report
    const totalReps = filteredSessions.reduce((sum, s) => sum + (Number(s.total_reps) || 0), 0);
    const avgAccuracy = filteredSessions.length > 0
        ? Math.round(filteredSessions.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / filteredSessions.length * 10) / 10
        : 0;

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            // Wait a tick to ensure React renders the hidden container with filtered data
            await new Promise(r => setTimeout(r, 100));

            const input = printRef.current;
            if (!input) throw new Error("Content area not found");

            // Temporarily make it visible but off-screen to ensure accurate capture
            input.style.display = 'block';

            const canvas = await html2canvas(input, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 800 // force a specific width
            });

            // Hide it again
            input.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            let filename = `${patient.full_name.replace(/ /g, '_')}_Report.pdf`;
            if (reportType === 'single') {
                filename = `${patient.full_name.replace(/ /g, '_')}_Session_Report.pdf`;
            }
            pdf.save(filename);

        } catch (error) {
            console.error("Failed to generate PDF", error);
            alert("Failed to generate PDF. See console for details.");
        } finally {
            setIsGenerating(false);
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} className="animate-fade-in no-print">

            <div className="glass-card animate-slide-in" style={{ width: 440, padding: 32, position: 'relative', background: 'var(--color-bg-secondary)' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                </button>

                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={20} style={{ color: 'var(--color-accent-blue)' }} />
                    Generate PDF Report
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                    Select the data range to include in the physical PDF report for <strong>{patient.full_name}</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Report Scope</label>
                        <select
                            className="input-field"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="all">All Sessions (Complete History)</option>
                            <option value="single">Specific Session</option>
                            <option value="range">Specific Date Range</option>
                        </select>
                    </div>

                    {reportType === 'single' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="animate-fade-in">
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Select Session</label>
                            <select
                                className="input-field"
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                            >
                                {sessions.map(s => {
                                    const d = new Date(s.timestamp);
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {d.toLocaleDateString()} - {s.exercise.replace('_', ' ')} ({Number(s.accuracy).toFixed(1)}%)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {reportType === 'range' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="animate-fade-in">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Start Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>End Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 32 }}>
                    <button
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={generatePDF}
                        disabled={isGenerating || sessions.length === 0}
                    >
                        {isGenerating ? "Processing PDF..." : (
                            <>
                                <Download size={16} />
                                Download Report
                            </>
                        )}
                    </button>
                    {filteredSessions.length === 0 && (
                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-error)', marginTop: 8 }}>
                            No sessions available in selected range.
                        </p>
                    )}
                </div>
            </div>

            {/* --- HIDDEN PRINT AREA --- */}
            {/* This is kept completely off-screen and only rendered for html2canvas */}
            <div 
                ref={printRef}
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 0,
                    width: '800px', // Fixed width for A4 proportion base
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    padding: '40px',
                    fontFamily: 'sans-serif',
                    display: 'none' // We toggle this in the JS before capturing
                }}
            >
                {/* Report Header */}
                <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>PhysioGuide Report</h1>
                        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: 0 }}>Patient Therapy & Compliance Summary</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                            <strong>Date:</strong> {new Date().toLocaleDateString()}
                        </p>
                        <p style={{ fontSize: '14px', color: '#475569', margin: 0, marginTop: '4px' }}>
                            <strong>Scope:</strong> {reportType === 'all' ? 'All Sessions' : reportType === 'single' ? 'Single Session' : 'Date Range'}
                        </p>
                    </div>
                </div>

                {/* Patient Information & Summary Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div style={{ width: '48%', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>Patient Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '14px' }}>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>Name:</span> <span style={{ color: '#0f172a' }}>{patient.full_name}</span>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>Patient ID:</span> <span style={{ color: '#0f172a' }}>{patient.id}</span>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>Therapist:</span> <span style={{ color: '#0f172a' }}>{patient.assigned_therapist || 'Not specified'}</span>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>Plan:</span> <span style={{ color: '#0f172a' }}>{patient.current_plan?.join(', ') || 'None'}</span>
                        </div>
                    </div>

                    <div style={{ width: '48%', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>Summary Statistics</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Sessions</span>
                                <span style={{ display: 'block', color: '#0f172a', fontSize: '20px', fontWeight: 'bold' }}>{filteredSessions.length}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Avg Accuracy</span>
                                <span style={{ display: 'block', color: avgAccuracy >= 80 ? '#16a34a' : avgAccuracy >= 60 ? '#ca8a04' : '#dc2626', fontSize: '20px', fontWeight: 'bold' }}>{avgAccuracy}%</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Total Reps</span>
                                <span style={{ display: 'block', color: '#0f172a', fontSize: '20px', fontWeight: 'bold' }}>{totalReps}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Compliance</span>
                                <span style={{ display: 'block', color: '#0f172a', fontSize: '20px', fontWeight: 'bold' }}>{patient.compliance_rate}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Session Logs Table */}
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>Session Logs</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>Date / Time</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>Exercise</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>Duration</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>Reps</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>Accuracy</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>Error Flags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSessions.map((sess, idx) => {
                            const d = new Date(sess.timestamp);
                            return (
                                <tr key={sess.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td style={{ padding: '10px 8px', color: '#334155' }}>
                                        {d.toLocaleDateString()}<br/>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{d.toLocaleTimeString()}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#334155', textTransform: 'capitalize', fontWeight: '500' }}>
                                        {sess.exercise.replace(/_/g, ' ')}
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#334155', textAlign: 'center' }}>
                                        {Number(sess.duration_sec).toFixed(0)}s
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#334155', textAlign: 'center' }}>
                                        {sess.total_reps}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: sess.accuracy >= 80 ? '#16a34a' : sess.accuracy >= 60 ? '#ca8a04' : '#dc2626' }}>
                                        {Number(sess.accuracy).toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#334155', textTransform: 'capitalize' }}>
                                        {!sess.error_flags || sess.error_flags.length === 0 
                                            ? <span style={{ color: '#16a34a' }}>None</span> 
                                            : <span style={{ color: '#dc2626' }}>{sess.error_flags.join(', ').replace(/_/g, ' ')}</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSessions.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No sessions recorded in this period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    <p>Generated by PhysioGuide Therapist Portal</p>
                </div>
            </div>

        </div>
    );
}
