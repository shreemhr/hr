'use client';
import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';

interface HiringRow {
  position_id: string;
  title: string;
  department: string | null;
  target: number;
  filled: number;
  open: number;
  fillRate: number;
}
interface Property { id: string; name: string; }

function HiringInner() {
  const [rows, setRows] = useState<HiringRow[]>([]);
  const [totalOpen, setTotalOpen] = useState(0);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = propertyId ? `?property_id=${propertyId}` : '';
    fetch(`/api/reports/hiring${q}`).then(r => r.json()).then(d => {
      setRows(d.rows ?? []);
      setTotalOpen(d.totalOpen ?? 0);
      setLoading(false);
    });
  }, [propertyId]);

  const s = {
    page: { padding: 32, maxWidth: 1000 },
    h1: { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub: { color: '#6b6760', fontSize: 14, marginTop: 4 },
    statRow: { display: 'flex', gap: 16, margin: '24px 0' },
    stat: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: '18px 22px', flex: 1 },
    statNum: { fontSize: 30, fontWeight: 800, color: '#1c1b22' },
    statLabel: { fontSize: 12, color: '#6b6760', marginTop: 4 },
    select: { padding: '8px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, background: '#fff' },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    th: { textAlign: 'left' as const, padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#6b6760', borderBottom: '1px solid #e9e4da', letterSpacing: '0.05em' },
    td: { padding: '14px 20px', fontSize: 14, borderBottom: '1px solid #f4f2ee' },
    barOuter: { background: '#f4f2ee', borderRadius: 999, height: 8, width: 120, overflow: 'hidden' },
    openBadge: { background: '#fae9e7', color: '#c0392b', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 },
    fullBadge: { background: '#e8f3ec', color: '#16794a', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 },
  } as const;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={s.h1}>Hiring Needs</h1>
          <div style={s.sub}>Open positions based on each role&rsquo;s headcount target.</div>
        </div>
        <select style={s.select} value={propertyId} onChange={e => setPropertyId(e.target.value)}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={s.statRow}>
        <div style={s.stat}>
          <div style={{ ...s.statNum, color: totalOpen > 0 ? '#c0392b' : '#16794a' }}>{totalOpen}</div>
          <div style={s.statLabel}>Total open positions</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>{rows.filter(r => r.open > 0).length}</div>
          <div style={s.statLabel}>Roles understaffed</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>{rows.length}</div>
          <div style={s.statLabel}>Roles with a target set</div>
        </div>
      </div>

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a8a39a' }}>
              No headcount targets set yet.<br />
              <span style={{ fontSize: 13 }}>Set a target on a role in <Link href="/admin/positions" style={{ color: '#4f46e5' }}>Admin → Positions</Link> to track hiring needs.</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={s.th}>Position</th>
                  <th style={s.th}>Target</th>
                  <th style={s.th}>Filled</th>
                  <th style={s.th}>Fill rate</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.position_id} style={i === rows.length - 1 ? { } : {}}>
                    <td style={s.td}>
                      <Link href={`/employees?position_id=${r.position_id}`} style={{ color: '#1c1b22', fontWeight: 600, textDecoration: 'none' }}>
                        {r.title}
                      </Link>
                      {r.department && <div style={{ fontSize: 12, color: '#a8a39a', marginTop: 2 }}>{r.department}</div>}
                    </td>
                    <td style={s.td}>{r.target}</td>
                    <td style={s.td}>{r.filled}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={s.barOuter}>
                          <div style={{ height: '100%', width: `${Math.min(100, r.fillRate)}%`, background: r.open > 0 ? '#c2780c' : '#16794a' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6b6760' }}>{r.fillRate}%</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      {r.open > 0
                        ? <span style={s.openBadge}>Need {r.open} more</span>
                        : <span style={s.fullBadge}>Fully staffed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

export default function HiringPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><HiringInner /></Suspense>;
}
