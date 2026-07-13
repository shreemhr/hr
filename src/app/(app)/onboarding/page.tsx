'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingRow {
  employee_id:   string;
  first_name:    string;
  last_name:     string;
  property_name: string;
  property_state:string;
  position_title:string;
  hire_date:     string;
  tasks_total:   number;
  tasks_done:    number;
}

interface OnboardingApiItem {
  employee: {
    id: string; first_name: string; last_name: string; hire_date: string | null;
    properties: { name: string; state: string } | null;
    positions: { title: string } | null;
  };
  summary: { total: number; done: number; isStarted: boolean };
}

export default function OnboardingQueuePage() {
  const [rows, setRows]       = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter]   = useState<'all' | 'pending' | 'complete'>('pending');

  useEffect(() => {
    fetch('/api/onboarding')
      .then(async r => {
        if (!r.ok) { setLoadError(true); return; }
        const data: OnboardingApiItem[] = await r.json();
        const mapped: OnboardingRow[] = (Array.isArray(data) ? data : [])
          .filter(item => item.summary.isStarted)
          .map(item => ({
            employee_id:    item.employee.id,
            first_name:     item.employee.first_name,
            last_name:      item.employee.last_name,
            property_name:  item.employee.properties?.name ?? '—',
            property_state: item.employee.properties?.state ?? '',
            position_title: item.employee.positions?.title ?? '—',
            hire_date:      item.employee.hire_date ?? '',
            tasks_total:    item.summary.total,
            tasks_done:     item.summary.done,
          }));
        setRows(mapped);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (filter === 'pending')  return r.tasks_done < r.tasks_total;
    if (filter === 'complete') return r.tasks_done >= r.tasks_total && r.tasks_total > 0;
    return true;
  });

  const pendingCount  = rows.filter(r => r.tasks_done < r.tasks_total).length;
  const completeCount = rows.filter(r => r.tasks_done >= r.tasks_total && r.tasks_total > 0).length;

  const s = {
    page:   { padding: 32, maxWidth: 960 },
    head:   { marginBottom: 24 },
    h1:     { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub:    { color: '#6b6760', marginTop: 4, fontSize: 14 },
    tabs:   { display: 'flex', gap: 0, borderBottom: '1px solid #e9e4da', marginBottom: 20 },
    tab:    (a: boolean) => ({ padding: '10px 20px', fontWeight: a ? 700 : 500, fontSize: 14, color: a ? '#4f46e5' : '#6b6760', background: 'none', border: 'none', borderBottom: a ? '2px solid #4f46e5' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }),
    card:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    hdr:    { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 110px', gap: 0, padding: '10px 20px', background: '#faf8f4', borderBottom: '1px solid #e9e4da', fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    row:    { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 110px', gap: 0, padding: '14px 20px', borderBottom: '1px solid #f4f2ee', alignItems: 'center', textDecoration: 'none', color: 'inherit' },
    prog:   (pct: number) => ({ display: 'flex', alignItems: 'center', gap: 8 }),
    bar:    { height: 6, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', flex: 1 },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Onboarding</h1>
        <p style={s.sub}>Track form collection for every new hire. Tap a row to open the checklist.</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Pending" value={pendingCount} color="#c0392b" bg="#fae9e7" border="#f0c8c2" />
        <StatCard label="Complete" value={completeCount} color="#16794a" bg="#e8f3ec" border="#bbf7d0" />
        <StatCard label="Total with onboarding" value={rows.length} color="#4f46e5" bg="#eef2ff" border="#c7d2fe" />
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        <button style={s.tab(filter === 'pending')}  onClick={() => setFilter('pending')}>Pending ({pendingCount})</button>
        <button style={s.tab(filter === 'complete')} onClick={() => setFilter('complete')}>Complete ({completeCount})</button>
        <button style={s.tab(filter === 'all')}      onClick={() => setFilter('all')}>All ({rows.length})</button>
      </div>

      <div style={s.card}>
        <div style={s.hdr}><span>Employee</span><span>Property</span><span>Position</span><span>Hired</span><span>Progress</span></div>
        {loading
          ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : loadError
            ? <div style={{ padding: 24, color: '#c0392b' }}>Failed to load — please refresh and try again.</div>
          : filtered.length === 0
            ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>
                {filter === 'pending' ? 'No pending onboarding 🎉' : filter === 'complete' ? 'No completed onboarding yet.' : 'No onboarding records. Start by adding employees and clicking "Start onboarding."'}
              </div>
            : filtered.map((r, i) => {
                const pct  = r.tasks_total > 0 ? Math.round((r.tasks_done / r.tasks_total) * 100) : 0;
                const done = pct === 100;
                return (
                  <Link key={r.employee_id} href={`/employees/${r.employee_id}/onboarding`}
                    style={{ ...s.row, ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}) }}>
                    <span style={{ fontWeight: 600, color: '#1c1b22' }}>{r.first_name} {r.last_name}</span>
                    <span style={{ color: '#6b6760', fontSize: 13 }}>{r.property_name} <span style={{ color: '#a8a39a' }}>({r.property_state})</span></span>
                    <span style={{ color: '#6b6760', fontSize: 13 }}>{r.position_title}</span>
                    <span style={{ color: '#6b6760', fontSize: 12 }}>
                      {r.hire_date ? new Date(r.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <div style={s.prog(pct)}>
                      <div style={s.bar}>
                        <div style={{ height: '100%', width: `${pct}%`, background: done ? '#16794a' : '#4f46e5', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: done ? '#16794a' : '#6b6760', minWidth: 30 }}>{pct}%</span>
                    </div>
                  </Link>
                );
              })
        }
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg, border }: { label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color, marginTop: 2 }}>{label}</div>
    </div>
  );
}
