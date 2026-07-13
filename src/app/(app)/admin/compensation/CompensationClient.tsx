'use client';
import { useState, useEffect } from 'react';

interface Position {
  id: string; title: string; department: string | null; pay_type: string;
  pay_band_min: number | null; pay_band_max: number | null; pay_band_mode: 'hard' | 'soft';
}
interface Exception {
  id: string; requested_rate: number; band_min: number | null; band_max: number | null;
  pay_type: string; reason: string | null; status: string;
  requested_by_name: string | null; decided_by_name: string | null; decided_at: string | null;
  decision_note: string | null; created_at: string;
  employees: { first_name: string; last_name: string } | null;
  positions: { title: string; department: string | null } | null;
}

const C = {
  ink: '#1c1b22', text2: '#6b6760', text3: '#a8a39a', line: '#e9e4da',
  indigo: '#4f46e5', indigoDk: '#4338ca', brass: '#b5832e', brassLt: '#f6efe1',
  green: '#16794a', greenLt: '#e8f3ec', red: '#c0392b', redLt: '#fae9e7',
  amber: '#c2780c', amberLt: '#fbf1de', card: '#fff',
};

export default function CompensationClient() {
  const [tab, setTab] = useState<'bands' | 'approvals' | 'history'>('bands');
  const [positions, setPositions] = useState<Position[]>([]);
  const [pending, setPending] = useState<Exception[]>([]);
  const [history, setHistory] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    const [posRes, excRes] = await Promise.all([
      fetch('/api/positions').catch(() => null),
      fetch('/api/compensation/exceptions').catch(() => null),
    ]);
    let hadError = false;
    let pos: unknown = [];
    let exc: unknown = [];
    if (posRes?.ok) pos = await posRes.json(); else hadError = true;
    if (excRes?.ok) exc = await excRes.json(); else hadError = true;

    setPositions(Array.isArray(pos) ? pos : []);
    const all: Exception[] = Array.isArray(exc) ? exc : [];
    setPending(all.filter(e => e.status === 'pending'));
    setHistory(all.filter(e => e.status !== 'pending'));
    setLoadError(hadError);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const s = {
    page: { padding: '38px 44px', maxWidth: 1040 },
    eyebrow: { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: C.brass, marginBottom: 9 },
    h1: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 31, letterSpacing: '-.4px', margin: 0 },
    lede: { color: C.text2, fontSize: 15, marginTop: 7, maxWidth: 600 },
    tabs: { display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, margin: '26px 0 0' },
    tab: (a: boolean) => ({ padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: a ? C.indigo : C.text2, borderBottom: a ? `2px solid ${C.indigo}` : '2px solid transparent', background: 'none', border: 'none' }),
    panel: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>Compensation · Corporate</div>
      <h1 style={s.h1}>Pay controls</h1>
      <p style={s.lede}>Set the approved pay band for each role and decide any requests to pay outside it. Only Owners and VP Operations can change bands or approve exceptions.</p>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'bands')} onClick={() => setTab('bands')}>Pay bands</button>
        <button style={s.tab(tab === 'approvals')} onClick={() => setTab('approvals')}>
          Approvals {pending.length > 0 && <span style={{ background: C.brass, color: C.ink, borderRadius: 999, fontSize: 11, padding: '1px 7px', marginLeft: 4 }}>{pending.length}</span>}
        </button>
        <button style={s.tab(tab === 'history')} onClick={() => setTab('history')}>History</button>
      </div>

      {loadError && (
        <div style={{ background: C.redLt, color: C.red, borderRadius: 10, padding: '12px 16px', marginTop: 20, fontSize: 13 }}>
          Some data failed to load — figures below may be incomplete. Refresh to try again.
        </div>
      )}

      {loading ? <div style={{ padding: 28, color: C.text2 }}>Loading…</div> : (
        <>
          {tab === 'bands' && <BandsTab positions={positions} onSaved={load} />}
          {tab === 'approvals' && <ApprovalsTab pending={pending} onDecide={load} />}
          {tab === 'history' && <HistoryTab history={history} />}
        </>
      )}
    </div>
  );
}

/* ---------------- Pay bands ---------------- */
function BandsTab({ positions, onSaved }: { positions: Position[]; onSaved: () => void }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', marginTop: 22 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {['Position', 'Type', 'Min', 'Max', 'If exceeded', ''].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: C.text3, background: '#fcfbf9', borderBottom: `1px solid ${C.line}` }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {positions.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.text3 }}>No positions yet. Add roles in Admin → Positions first.</td></tr>
          ) : positions.map(p => <BandRow key={p.id} pos={p} onSaved={onSaved} />)}
        </tbody>
      </table>
    </div>
  );
}

function BandRow({ pos, onSaved }: { pos: Position; onSaved: () => void }) {
  const [min, setMin] = useState(pos.pay_band_min?.toString() ?? '');
  const [max, setMax] = useState(pos.pay_band_max?.toString() ?? '');
  const [mode, setMode] = useState<'hard' | 'soft'>(pos.pay_band_mode ?? 'hard');
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [err, setErr] = useState('');

  const dirty = (min !== (pos.pay_band_min?.toString() ?? '')) ||
                (max !== (pos.pay_band_max?.toString() ?? '')) ||
                (mode !== (pos.pay_band_mode ?? 'hard'));

  async function save() {
    setErr('');
    if (min !== '' && Number(min) < 0) { setErr('Min cannot be negative'); return; }
    if (max !== '' && Number(max) < 0) { setErr('Max cannot be negative'); return; }
    if (min !== '' && max !== '' && Number(min) > Number(max)) { setErr('Min cannot exceed max'); return; }
    setSaving(true);
    const res = await fetch(`/api/positions/${pos.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pay_band_min: min === '' ? null : Number(min), pay_band_max: max === '' ? null : Number(max), pay_band_mode: mode }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? 'Save failed'); return; }
    setSavedTick(true); setTimeout(() => setSavedTick(false), 1600);
    onSaved();
  }

  const unit = pos.pay_type === 'salary' ? '/yr' : '/hr';
  const inputStyle = { width: 90, padding: '7px 9px', border: `1.5px solid ${C.line}`, borderRadius: 8, fontSize: 14 } as const;

  return (
    <tr>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{pos.title}</div>
        {pos.department && <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{pos.department}</div>}
        {err && <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>{err}</div>}
      </td>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.text2 }}>{pos.pay_type === 'salary' ? 'Salary' : 'Hourly'}</td>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: 7, color: C.text3, fontSize: 13 }}>$</span>
          <input value={min} onChange={e => setMin(e.target.value)} type="number" step="0.25" min="0" placeholder="—" style={{ ...inputStyle, paddingLeft: 20 }} />
        </span>
      </td>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: 7, color: C.text3, fontSize: 13 }}>$</span>
          <input value={max} onChange={e => setMax(e.target.value)} type="number" step="0.25" min="0" placeholder="—" style={{ ...inputStyle, paddingLeft: 20 }} />
        </span>
        <span style={{ fontSize: 11, color: C.text3, marginLeft: 5 }}>{unit}</span>
      </td>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <select value={mode} onChange={e => setMode(e.target.value as 'hard' | 'soft')} style={{ width: 'auto', padding: '7px 9px', border: `1.5px solid ${C.line}`, borderRadius: 8, fontSize: 13 }}>
          <option value="hard">Block + require approval</option>
          <option value="soft">Allow + notify corporate</option>
        </select>
      </td>
      <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}`, textAlign: 'right' }}>
        {savedTick ? <span style={{ color: C.green, fontWeight: 600, fontSize: 13 }}>✓ Saved</span>
          : <button onClick={save} disabled={!dirty || saving} style={{ background: dirty ? C.indigo : '#f4f2ee', color: dirty ? '#fff' : C.text3, fontWeight: 600, fontSize: 13, padding: '7px 14px', borderRadius: 8 }}>{saving ? '…' : 'Save'}</button>}
      </td>
    </tr>
  );
}

/* ---------------- Approvals ---------------- */
function ApprovalsTab({ pending, onDecide }: { pending: Exception[]; onDecide: () => void }) {
  if (pending.length === 0) {
    return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 40, textAlign: 'center', color: C.text3, marginTop: 22 }}>All caught up — no pending requests.</div>;
  }
  return (
    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {pending.map(e => <ApprovalCard key={e.id} exc={e} onDecide={onDecide} />)}
    </div>
  );
}

function ApprovalCard({ exc, onDecide }: { exc: Exception; onDecide: () => void }) {
  const [busy, setBusy] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const fmt = (n: number) => exc.pay_type === 'salary' ? `$${n.toLocaleString()}/yr` : `$${n.toFixed(2)}/hr`;
  const name = exc.employees ? `${exc.employees.first_name} ${exc.employees.last_name}` : 'Employee';
  const band = `${exc.band_min != null ? '$' + Number(exc.band_min).toFixed(2) : '—'}–${exc.band_max != null ? '$' + Number(exc.band_max).toFixed(2) : '—'}`;

  async function decide(decision: 'approved' | 'denied') {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/compensation/exceptions/${exc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      if (res.ok) { onDecide(); return; }
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? 'Failed to save decision.');
    } catch {
      setErr('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{name} · {exc.positions?.title ?? 'Role'}</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>Requested by {exc.requested_by_name ?? 'a manager'}</div>
          {exc.reason && <div style={{ fontSize: 13, color: C.text2, marginTop: 10, padding: '10px 13px', background: '#fcfbf9', borderLeft: `2px solid ${C.brass}`, borderRadius: '0 8px 8px 0' }}>{exc.reason}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, color: C.red }}>{fmt(Number(exc.requested_rate))}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>band {band}</div>
        </div>
      </div>
      {err && <div style={{ fontSize: 13, color: C.red, marginTop: 12 }}>{err}</div>}
      {showDeny && (
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to the requester…" style={{ width: '100%', marginTop: 14, padding: '10px 13px', border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: 14, minHeight: 60, resize: 'vertical' }} />
      )}
      <div style={{ display: 'flex', gap: 9, marginTop: 14, justifyContent: 'flex-end' }}>
        {!showDeny ? (
          <>
            <button onClick={() => setShowDeny(true)} disabled={busy} style={{ background: '#f4f2ee', color: C.text2, fontWeight: 600, fontSize: 13, padding: '8px 15px', borderRadius: 8 }}>Deny…</button>
            <button onClick={() => decide('approved')} disabled={busy} style={{ background: C.green, color: '#fff', fontWeight: 600, fontSize: 13, padding: '8px 15px', borderRadius: 8 }}>{busy ? '…' : 'Approve'}</button>
          </>
        ) : (
          <>
            <button onClick={() => setShowDeny(false)} disabled={busy} style={{ background: '#f4f2ee', color: C.text2, fontWeight: 600, fontSize: 13, padding: '8px 15px', borderRadius: 8 }}>Cancel</button>
            <button onClick={() => decide('denied')} disabled={busy} style={{ background: C.red, color: '#fff', fontWeight: 600, fontSize: 13, padding: '8px 15px', borderRadius: 8 }}>{busy ? '…' : 'Confirm denial'}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */
function HistoryTab({ history }: { history: Exception[] }) {
  if (history.length === 0) {
    return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 40, textAlign: 'center', color: C.text3, marginTop: 22 }}>No decisions yet.</div>;
  }
  const fmt = (n: number, t: string) => t === 'salary' ? `$${n.toLocaleString()}/yr` : `$${n.toFixed(2)}/hr`;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', marginTop: 22 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {['Employee', 'Requested', 'Band', 'Decision', 'By'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: C.text3, background: '#fcfbf9', borderBottom: `1px solid ${C.line}` }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {history.map(e => {
            const name = e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Employee';
            const band = `${e.band_min != null ? '$' + Number(e.band_min).toFixed(2) : '—'}–${e.band_max != null ? '$' + Number(e.band_max).toFixed(2) : '—'}`;
            const approved = e.status === 'approved';
            const date = e.decided_at ? new Date(e.decided_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return (
              <tr key={e.id}>
                <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{e.positions?.title ?? ''}</div>
                </td>
                <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}`, fontFamily: "'Fraunces', serif", fontSize: 15 }}>{fmt(Number(e.requested_rate), e.pay_type)}</td>
                <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.text2 }}>{band}</td>
                <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ background: approved ? C.greenLt : C.redLt, color: approved ? C.green : C.red, borderRadius: 999, fontSize: 12, fontWeight: 600, padding: '3px 11px' }}>{approved ? 'Approved' : 'Denied'}</span>
                </td>
                <td style={{ padding: '14px 20px', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.text2 }}>{e.decided_by_name ?? '—'} · {date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
