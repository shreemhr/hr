'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PortalEmployee {
  id: string; first_name: string; last_name: string; hire_date: string;
  property_name: string; position_title: string;
}
interface ObSummary { total: number; done: number; pending: number; pct: number; }
interface AckStatus { acknowledged: boolean; acknowledged_at: string | null; hasLetter: boolean; }
interface DiscSummary { total: number; pending: number; }
interface ReviewSummary { total: number; }

export default function PortalDashboardPage() {
  const [emp,  setEmp]  = useState<PortalEmployee | null>(null);
  const [ob,   setOb]   = useState<ObSummary | null>(null);
  const [ack,  setAck]  = useState<AckStatus | null>(null);
  const [disc, setDisc] = useState<DiscSummary | null>(null);
  const [revs, setRevs] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/me').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/portal/onboarding').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/portal/offer-letter').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/portal/disciplinary').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/portal/reviews').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([empData, obData, olData, discData, revData]) => {
      setEmp(empData);
      if (obData?.tasks) {
        const tasks = obData.tasks as { status: string }[];
        const done = tasks.filter(t => t.status === 'collected' || t.status === 'na').length;
        setOb({ total: tasks.length, done, pending: tasks.filter(t => t.status === 'pending').length, pct: tasks.length ? Math.round(done / tasks.length * 100) : 0 });
      }
      if (olData) setAck({ acknowledged: !!olData.acknowledged_at, acknowledged_at: olData.acknowledged_at, hasLetter: olData.hasLetter });
      if (Array.isArray(discData)) setDisc({ total: discData.length, pending: discData.filter((r: { employee_acknowledged: boolean }) => !r.employee_acknowledged).length });
      if (Array.isArray(revData)) setRevs({ total: revData.length });
      setLoading(false);
    });
  }, []);

  const s = {
    h1:    { fontSize: 24, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:   { color: '#6b6760', fontSize: 14, margin: '0 0 28px' },
    grid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 24 },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 20 },
    cardH: { fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 },
    big:   { fontSize: 28, fontWeight: 800, color: '#1c1b22', lineHeight: 1 },
    bigSub:{ fontSize: 12, color: '#6b6760', marginTop: 4 },
    sec:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 22, marginBottom: 14 },
    secH:  { fontSize: 15, fontWeight: 700, color: '#1c1b22', marginBottom: 14 },
    bar:   { height: 8, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', margin: '8px 0 4px' },
    link:  (warn?: boolean) => ({ display: 'inline-block', background: warn ? '#c0392b' : '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, marginTop: 12 }),
    warn:  { background: '#fae9e7', border: '1px solid #f0c8c2', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#c0392b', fontWeight: 600 },
  };

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;
  if (!emp)    return <div style={{ color: '#c0392b' }}>Not signed in. <a href="/portal">Sign in</a></div>;

  const hireFmt = emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div>
      <h1 style={s.h1}>Welcome, {emp.first_name}!</h1>
      <p style={s.sub}>{emp.position_title} · {emp.property_name} · Hired {hireFmt}</p>

      {/* Alerts */}
      {disc && disc.pending > 0 && (
        <div style={s.warn}>
          ⚠ You have {disc.pending} disciplinary record{disc.pending !== 1 ? 's' : ''} requiring your acknowledgement.
          <Link href="/portal/disciplinary" style={{ marginLeft: 12, color: '#c0392b', fontWeight: 700, textDecoration: 'underline' }}>Review now →</Link>
        </div>
      )}
      {ack?.hasLetter && !ack.acknowledged && (
        <div style={{ ...s.warn, background: '#fbf1de', borderColor: '#fde68a', color: '#8a5a13' }}>
          📄 Your offer letter is ready for acknowledgement.
          <Link href="/portal/offer-letter" style={{ marginLeft: 12, color: '#8a5a13', fontWeight: 700, textDecoration: 'underline' }}>Review now →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardH}>Onboarding</div>
          {ob ? (<><div style={s.big}>{ob.pct}%</div><div style={s.bigSub}>{ob.done} of {ob.total} forms</div></>) : <div style={{ color: '#a8a39a', fontSize: 13 }}>Not started</div>}
        </div>
        <div style={s.card}>
          <div style={s.cardH}>Offer Letter</div>
          <div style={s.big}>{ack?.acknowledged ? '✓' : '—'}</div>
          <div style={s.bigSub}>{ack?.acknowledged ? 'Acknowledged' : ack?.hasLetter ? 'Pending' : 'Not yet'}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardH}>Disciplinary</div>
          <div style={s.big}>{disc?.total ?? 0}</div>
          <div style={s.bigSub}>{disc?.pending ? `${disc.pending} pending ack` : 'All acknowledged'}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardH}>Reviews</div>
          <div style={s.big}>{revs?.total ?? 0}</div>
          <div style={s.bigSub}>Performance reviews</div>
        </div>
      </div>

      {/* Quick links */}
      {ob && (
        <div style={s.sec}>
          <div style={s.secH}>📋 Onboarding Forms</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>{ob.done} of {ob.total} complete</span>
            <span style={{ color: ob.pending === 0 ? '#16794a' : '#c2780c', fontWeight: 600 }}>{ob.pending === 0 ? '🎉 All done!' : `${ob.pending} pending`}</span>
          </div>
          <div style={s.bar}><div style={{ height: '100%', width: `${ob.pct}%`, background: ob.pct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999 }} /></div>
          <Link href="/portal/onboarding" style={s.link()}>View checklist →</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {ack?.hasLetter && (
          <div style={s.sec}>
            <div style={s.secH}>📄 Offer Letter</div>
            <div style={{ fontSize: 13, color: ack.acknowledged ? '#16794a' : '#c2780c', fontWeight: 600 }}>
              {ack.acknowledged ? '✓ Acknowledged' : 'Pending your signature'}
            </div>
            <Link href="/portal/offer-letter" style={s.link()}>{ack.acknowledged ? 'View' : 'Review →'}</Link>
          </div>
        )}
        {disc && disc.total > 0 && (
          <div style={s.sec}>
            <div style={s.secH}>⚠ Disciplinary Records</div>
            <div style={{ fontSize: 13, color: disc.pending > 0 ? '#c0392b' : '#16794a', fontWeight: 600 }}>
              {disc.pending > 0 ? `${disc.pending} need acknowledgement` : 'All acknowledged'}
            </div>
            <Link href="/portal/disciplinary" style={s.link(disc.pending > 0)}>View records →</Link>
          </div>
        )}
        {revs && revs.total > 0 && (
          <div style={s.sec}>
            <div style={s.secH}>📊 Performance Reviews</div>
            <div style={{ fontSize: 13, color: '#6b6760' }}>{revs.total} review{revs.total !== 1 ? 's' : ''} available</div>
            <Link href="/portal/reviews" style={s.link()}>View reviews →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
