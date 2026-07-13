'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Task {
  id: string; form_id: string; form_name: string; short_name: string;
  description: string; link: string | null; federal: boolean;
  status: 'pending' | 'collected' | 'na'; collected_at: string | null; notes: string | null;
}

const STATUS_CONFIG = {
  collected: { label: 'Collected',   bg: '#e8f3ec', color: '#16794a', icon: '✓' },
  na:        { label: 'Not Required', bg: '#faf8f4', color: '#6b6760', icon: '—' },
  pending:   { label: 'Pending',      bg: '#fbf1de', color: '#c2780c', icon: '○' },
};

export default function PortalOnboardingPage() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/onboarding')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks ?? []); setLoading(false); });
  }, []);

  const total   = tasks.length;
  const done    = tasks.filter(t => t.status !== 'pending').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  const federal = tasks.filter(t => t.federal);
  const state   = tasks.filter(t => !t.federal);

  const s = {
    h1:    { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:   { color: '#6b6760', fontSize: 14, margin: '0 0 24px' },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 24, marginBottom: 16 },
    sh:    { fontSize: 13, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 14 },
    row:   { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid #f4f2ee' },
    bar:   { height: 10, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', margin: '10px 0 6px' },
    note:  { background: '#faf8f4', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b6760', marginTop: 6 },
  };

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;

  return (
    <div>
      <Link href="/portal/dashboard" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={s.h1}>Onboarding Forms</h1>
      <p style={s.sub}>Your HR team manages these forms. This is a read-only view of your status.</p>

      {/* Progress */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          <span style={{ fontWeight: 700 }}>{done} of {total} forms complete</span>
          <span style={{ color: pending === 0 ? '#16794a' : '#c2780c', fontWeight: 600 }}>
            {pending === 0 ? '🎉 All done!' : `${pending} pending`}
          </span>
        </div>
        <div style={s.bar}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999, transition: 'width 0.3s' }} />
        </div>
        <div style={{ color: '#a8a39a', fontSize: 12 }}>{pct}% complete</div>
      </div>

      {/* Federal forms */}
      {federal.length > 0 && (
        <div style={s.card}>
          <div style={s.sh}>Federal Forms</div>
          {federal.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status];
            return (
              <div key={t.id} style={{ ...s.row, borderBottom: i === federal.length - 1 ? 'none' : undefined }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1b22' }}>{t.short_name}</div>
                  <div style={{ color: '#6b6760', fontSize: 12, marginTop: 2 }}>{t.description}</div>
                  {t.link && (
                    <a href={t.link} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: 12, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                      Download form ↗
                    </a>
                  )}
                  {t.notes && <div style={s.note}>Note from HR: {t.notes}</div>}
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* State forms */}
      {state.length > 0 && (
        <div style={s.card}>
          <div style={s.sh}>State Forms</div>
          {state.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status];
            return (
              <div key={t.id} style={{ ...s.row, borderBottom: i === state.length - 1 ? 'none' : undefined }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1b22' }}>{t.short_name}</div>
                  <div style={{ color: '#6b6760', fontSize: 12, marginTop: 2 }}>{t.description}</div>
                  {t.link && (
                    <a href={t.link} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: 12, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                      Download form ↗
                    </a>
                  )}
                  {t.notes && <div style={s.note}>Note from HR: {t.notes}</div>}
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && (
        <div style={{ ...s.card, color: '#6b6760', textAlign: 'center' as const, padding: 40 }}>
          Your HR team hasn't started onboarding yet. Check back soon.
        </div>
      )}
    </div>
  );
}
