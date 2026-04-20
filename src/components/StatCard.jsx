export default function StatCard({ icon: Icon, label, value, subtitle, gradient = 'cyan' }) {
    const gradientClass = `stat-gradient-${gradient}`;

    return (
        <div className={`glass-card ${gradientClass} animate-fade-in`} style={{ padding: '24px', flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {label}
                    </p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                        {value}
                    </p>
                    {subtitle && (
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={22} style={{ opacity: 0.7 }} />
                    </div>
                )}
            </div>
        </div>
    );
}
