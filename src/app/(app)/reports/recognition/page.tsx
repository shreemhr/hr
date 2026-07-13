'use client';
import { useState, useEffect, Suspense } from 'react';

interface Row {
  employee_id: string; name: string; property: string; position: string;
  score: number; ratingKey: string | null; disciplinaryCount: number;
  tenureDays: number; kudosTotal: number; kudosThisMonth: number;
  bandMax: number | null; signals: string[];
}
interface Property { id: string; name: string; }

const C = {
  ink: '#1c1b22', text2: '#6b6760', text3: '#a8a39a', line: '#e9e4da',
  indigo: '#4f46e5', indigoLt: '#eef2ff', brass: '#b5832e', brassBr: '#d9b160', brassLt: '#f6efe1',
  card: '#fff',
};

function RecognitionInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (propertyId) p.set('property_id', propertyId);
    if (month) p.set('month', month);
    fetch(`/api/reports/recognition?${p}`).then(r => r.json()).then(d => {
      setRows(d.rows ?? []);
      if (!month && d.month) setMonth(d.month);
      setLoading(false);
    });
  }, [propertyId]); // eslint-disable-line

  const monthLabel = month
    ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const top3 = rows.slice(0, 3);

  const s = {
    page: { padding: '38px 44px', maxWidth: 1040 },
    eyebrow: { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: C.brass, marginBottom: 9 },
    h1: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 31, letterSpacing: '-.4px', margin: 0 },
    lede: { color: C.text2, fontSize: 15, marginTop: 7, maxWidth: 620 },
    select: { width: 'auto', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, background: '#fff' },
    hero: { background: 'radial-gradient(120% 140% at 100% 0%, rgba(217,177,96,.16), transparent 55%), #1c1b22', color: '#fff', borderRadius: 18, padding: '30px 32px', marginTop: 24, position: 'relative' as const, overflow: 'hidden' as const },
    podium: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 22 },
    panel: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>Recognition</div>
      <h1 style={s.h1}>Top performers</h1>
      <p style={s.lede}>Auto-scored from review ratings, clean records, tenure, and kudos — a fresh list every month. Use it to spot who&rsquo;s ready for a raise or promotion.</p>

      <div style={{ display: 'flex', gap: 11, marginTop: 20 }}>
        <select style={s.select} value={propertyId} onChange={e => setPropertyId(e.target.value)}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? <div style={{ padding: 28, color: C.text2 }}>Loading…</div> : rows.length === 0 ? (
        <div style={{ ...s.panel, padding: 44, textAlign: 'center', color: C.text3 }}>
          No active employees to rank yet. Once you have staff with reviews or kudos, your monthly standouts appear here.
        </div>
      ) : (
        <>
          <div style={s.hero}>
            <div style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: C.brassBr, fontWeight: 600 }}>{monthLabel} · {propertyId ? properties.find(p => p.id === propertyId)?.name : 'Portfolio-wide'}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 27, fontWeight: 600, marginTop: 8 }}>This month&rsquo;s standouts</div>
            <p style={{ color: '#b9b4ab', fontSize: 14, marginTop: 6, maxWidth: 480 }}>
              {top3.filter(r => r.bandMax != null).length > 0
                ? 'Some of your highest scorers are near the top of their pay band — worth a promotion conversation.'
                : 'These are the people carrying the most weight across your hotels right now.'}
            </p>
          </div>

          <div style={s.podium}>
            {top3.map((r, i) => (
              <div key={r.employee_id} style={{ background: C.card, border: i === 0 ? '1px solid #e7cd97' : `1px solid ${C.line}`, borderRadius: 15, padding: 20, position: 'relative', boxShadow: i === 0 ? '0 8px 22px rgba(181,131,46,.14)' : 'none' }}>
                <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 700, width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: i === 0 ? 'linear-gradient(150deg,#d9b160,#b5832e)' : '#f4f2ee', color: i === 0 ? C.ink : C.text2 }}>{i + 1}</div>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: C.indigoLt, color: C.indigo, display: 'grid', placeItems: 'center', fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19 }}>{initials(r.name)}</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 13 }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: C.text2, marginTop: 2 }}>{r.position} · {r.property}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 14 }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600 }}>{r.score}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>star score</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 13 }}>
                  {r.signals.slice(0, 3).map((sig, j) => (
                    <span key={j} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: sig.includes('kudos') ? C.brassLt : '#f4f2ee', color: sig.includes('kudos') ? C.brass : C.text2 }}>{sig}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={s.panel}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.line}`, fontWeight: 600, fontSize: 15 }}>Full ranking · {monthLabel}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Employee', 'Property', 'Star score', 'Signals'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: C.text3, background: '#fcfbf9', borderBottom: `1px solid ${C.line}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.employee_id}>
                    <td style={{ padding: '14px 22px', borderBottom: `1px solid ${C.line}` }}><b style={{ fontWeight: 600 }}>{r.name}</b><div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{r.position}</div></td>
                    <td style={{ padding: '14px 22px', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.text2 }}>{r.property}</td>
                    <td style={{ padding: '14px 22px', borderBottom: `1px solid ${C.line}` }}>
                      <span style={{ display: 'inline-block', width: 90, height: 7, background: C.line, borderRadius: 999, overflow: 'hidden', verticalAlign: 'middle', marginRight: 9 }}>
                        <span style={{ display: 'block', height: '100%', width: `${r.score}%`, background: 'linear-gradient(90deg,#b5832e,#d9b160)' }} />
                      </span>
                      <b style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{r.score}</b>
                    </td>
                    <td style={{ padding: '14px 22px', borderBottom: `1px solid ${C.line}` }}>
                      {r.bandMax != null
                        ? <span style={{ background: C.indigoLt, color: C.indigo, borderRadius: 999, fontSize: 12, fontWeight: 600, padding: '3px 11px' }}>Near band ceiling</span>
                        : <span style={{ color: C.text3 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12.5, color: C.text2, marginTop: 10 }}>Score blends data you already collect (review rating, disciplinary record, tenure) with manual kudos. Give kudos from any employee&rsquo;s profile.</p>
        </>
      )}
    </div>
  );
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function RecognitionPage() {
  return <Suspense fallback={<div style={{ padding: 38 }}>Loading…</div>}><RecognitionInner /></Suspense>;
}
