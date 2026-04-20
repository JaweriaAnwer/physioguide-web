import { useState } from 'react';
import { FileText, Calendar, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function GenerateReportModal({ isOpen, onClose, patient, sessions }) {
    const [reportType, setReportType] = useState('all'); // 'all', 'single', 'range'
    const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || '');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            // We'll temporarily render a hidden report container in the DOM, 
            // construct the specific HTML based on user selection, 
            // capture it with html2canvas, and convert it to a PDF.

            // For simplicity in this React logic without building entirely new unmounted components,
            // we will apply a specific class/style to the existing dashboard elements to format them,
            // capture the whole profile page, and save it.

            // Wait a small tick to ensure any UI states update if needed.
            await new Promise(r => setTimeout(r, 100));

            // Select the main content area of the profile page
            const input = document.getElementById('report-content-area');
            if (!input) throw new Error("Content area not found");

            // Capture
            const canvas = await html2canvas(input, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#ffffff' // Force white background for PDF
            });

            const imgData = canvas.toDataURL('image/png');

            // A4 dimensions
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // Download
            let filename = `${patient.full_name.replace(' ', '_')}_Report.pdf`;
            if (reportType === 'single') {
                filename = `${patient.full_name.replace(' ', '_')}_Session_Report.pdf`;
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
                    Download PDF Report
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                    Select the data range to include in the physical PDF report for <strong>{patient.full_name}</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Report Type Selection */}
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

                    {/* Conditional Fields based on scope */}
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
                                            {d.toLocaleDateString()} - {s.exercise.replace('_', ' ')} ({s.accuracy}%)
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
                    {sessions.length === 0 && (
                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-error)', marginTop: 8 }}>
                            No sessions available to report.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
