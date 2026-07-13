'use client';
import { useState, useEffect, Suspense } from 'react';

interface Overview {
  annualizedRate: number; terminations: number; hires: number; netChange: number;
  avgTenureDays: number | null; startHeadcount: number; endHeadcount: number;
  voluntary: number; involuntary: number; periodDays: number;
}
interface PropRow { property_id: string; name: string; terminations: number; avgHeadcount: number; annualizedRate: number; critical: boolean; }
interface PosRow { position_id: string; title: string; terminations: number; avgHeadcount: number; annualizedRate: number; voluntary: number; involuntary: number; }
interface TrendPt { month: string; terminations: number; hires: number; }
interface Property { id: string; name: string; }

const PERIODS = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 6 months', value: 182 },
  { label: 'Last 12 months', value: 365 },
];

function TurnoverInner() {
  const [tab, setTab] = useState<'overview' | 'property' | 'position' | 'trend'>('overview');
  const [period, setPeriod] = useState(365);
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [data, setData] = useState<{ overview: Overview; byProperty: PropRow[]; byPosition: PosRow[]; trend: TrendPt[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period: String(period) });
    if (propertyId) params.set('property_id', propertyId);
    fetch(`/api/reports/turnover?${params}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [period, propertyId]);

  const s = {
    page: { padding: 32, maxWidth: 1000 },
    h1: { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub: { color: '#6b6760', fontSize: 14, marginTop: 4 },
    controls: { display: 'flex', gap: 12, margin: '20px 0' },
    select: { padding: '8px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, background: '#fff' },
    tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e9e4da', marginBottom: 24 },
    tab: (active: boolean) => ({ padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: active ? '#4f46e5' : '#6b6760', borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent', background: 'none', border: 'none' }),
    statRow: { display: 'flex', gap: 16, flexWrap: 'wrap' as const },
    stat: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: '18px 22px', flex: '1 1 160px' },
    statNum: { fontSize: 30, fontWeight: 800, color: '#1c1b22' },
    statLabel: { fontSize: 12, color: '#6b6760', marginTop: 4 },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    th: { textAlign: 'left' as const, padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#6b6760', borderBottom: '1px solid #e9e4da', letterSpacing: '0.05em' },
    td: { padding: '14px 20px', fontSize: 14, borderBottom: '1px solid #f4f2ee' },
    callout: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#3730a3', marginTop: 20 },
  } as const;

  function rateColor(r: number) {
    if (r >= 100) return '#c0392b';
    if (r >= 70) return '#c2780c';
    return '#16794a';
  }

  const ov = data?.overview;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={s.h1}>Turnover Analytics</h1>
          <div style={s.sub}>Track who&rsquo;s leaving, how fast, and which roles and hotels lose people.</div>
        </div>
      </div>

      <div style={s.controls}>
        <select style={s.select} value={period} onChange={e => setPeriod(Number(e.target.value))}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select style={s.select} value={propertyId} onChange={e => setPropertyId(e.target.value)}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={s.tabs}>
        {(['overview', 'property', 'position', 'trend'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'property' ? 'By Property' : t === 'position' ? 'By Position' : 'Trend'}
          </button>
        ))}
      </div>

      {loading || !data ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div> : (
        <>
          {tab === 'overview' && ov && (
            <>
              <div style={s.statRow}>
                <div style={s.stat}>
                  <div style={{ ...s.statNum, color: rateColor(ov.annualizedRate) }}>{ov.annualizedRate}%</div>
                  <div style={s.statLabel}>Annualized turnover rate</div>
                </div>
                <div style={s.stat}><div style={s.statNum}>{ov.terminations}</div><div style={s.statLabel}>Terminations</div></div>
                <div style={s.stat}><div style={s.statNum}>{ov.hires}</div><div style={s.statLabel}>New hires</div></div>
                <div style={s.stat}>
                  <div style={{ ...s.statNum, color: ov.netChange >= 0 ? '#16794a' : '#c0392b' }}>{ov.netChange >= 0 ? '+' : ''}{ov.netChange}</div>
                  <div style={s.statLabel}>Net headcount change</div>
                </div>
                <div style={s.stat}>
                  <div style={s.statNum}>{ov.avgTenureDays != null ? `${ov.avgTenureDays}d` : '—'}</div>
                  <div style={s.statLabel}>Avg tenure at separation</div>
                </div>
              </div>
              <div style={{ ...s.statRow, marginTop: 16 }}>
                <div style={s.stat}><div style={s.statNum}>{ov.voluntary}</div><div style={s.statLabel}>Voluntary departures</div></div>
                <div style={s.stat}><div style={s.statNum}>{ov.involuntary}</div><div style={s.statLabel}>Involuntary departures</div></div>
                <div style={s.stat}><div style={s.statNum}>{ov.endHeadcount}</div><div style={s.statLabel}>Current active headcount</div></div>
              </div>
              <div style={s.callout}>
                Hotel industry turnover averages <strong>70–80% annually</strong>. Rates above 100% (annualized) typically signal a retention problem at a property.
              </div>
            </>
          )}

          {tab === 'property' && (
            <div style={s.card}>
              {data.byProperty.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#a8a39a' }}>No data for this period.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={s.th}>Property</th><th style={s.th}>Terminations</th><th style={s.th}>Avg headcount</th><th style={s.th}>Annualized rate</th></tr></thead>
                  <tbody>
                    {data.byProperty.map(r => (
                      <tr key={r.property_id}>
                        <td style={s.td}>
                          <span style={{ fontWeight: 600 }}>{r.name}</span>
                          {r.critical && <span style={{ marginLeft: 8, background: '#fae9e7', color: '#c0392b', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>CRITICAL</span>}
                        </td>
                        <td style={s.td}>{r.terminations}</td>
                        <td style={s.td}>{r.avgHeadcount}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: rateColor(r.annualizedRate) }}>{r.annualizedRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'position' && (
            <div style={s.card}>
              {data.byPosition.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#a8a39a' }}>No terminations in this period.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={s.th}>Position</th><th style={s.th}>Terminations</th><th style={s.th}>Vol / Invol</th><th style={s.th}>Annualized rate</th></tr></thead>
                  <tbody>
                    {data.byPosition.map(r => (
                      <tr key={r.position_id}>
                        <td style={{ ...s.td, fontWeight: 600 }}>{r.title}</td>
                        <td style={s.td}>{r.terminations}</td>
                        <td style={s.td}><span style={{ color: '#16794a' }}>{r.voluntary}</span> / <span style={{ color: '#c0392b' }}>{r.involuntary}</span></td>
                        <td style={{ ...s.td, fontWeight: 700, color: rateColor(r.annualizedRate) }}>{r.annualizedRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'trend' && <TrendChart trend={data.trend} />}
        </>
      )}
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPt[] }) {
  const W = 920, H = 280, pad = 36, barGroupW = (W - pad * 2) / trend.length;
  const max = Math.max(1, ...trend.map(t => Math.max(t.terminations, t.hires)));
  const barW = barGroupW * 0.32;
  return (
    <div style={{ background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#4f46e5', borderRadius: 3, display: 'inline-block' }} /> New hires</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#c0392b', borderRadius: 3, display: 'inline-block' }} /> Terminations</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e9e4da" />
        {trend.map((t, i) => {
          const gx = pad + i * barGroupW + barGroupW / 2;
          const hireH = (t.hires / max) * (H - pad * 2);
          const termH = (t.terminations / max) * (H - pad * 2);
          return (
            <g key={i}>
              <rect x={gx - barW - 2} y={H - pad - hireH} width={barW} height={hireH} fill="#4f46e5" rx={2} />
              <rect x={gx + 2} y={H - pad - termH} width={barW} height={termH} fill="#c0392b" rx={2} />
              <text x={gx} y={H - pad + 16} textAnchor="middle" fontSize="10" fill="#6b6760">{t.month}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function TurnoverPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><TurnoverInner /></Suspense>;
}
