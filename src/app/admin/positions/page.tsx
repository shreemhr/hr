'use client';
import { useState, useEffect } from 'react';

interface Position {
  id: string;
  title: string;
  department: string | null;
  pay_type?: string;
  pay_rate?: number | null;
  headcount_target: number | null;
}
interface HiringRow {
  position_id: string;
  filled: number;
  open: number;
  target: number;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [hiring, setHiring] = useState<Record<string, HiringRow>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', department: '', headcount_target: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');

  const load = async () => {
    const [posData, hireData] = await Promise.all([
      fetch('/api/positions').then(r => r.json()),
      fetch('/api/reports/hiring').then(r => r.json()).catch(() => ({ rows: [] })),
    ]);
    setPositions(Array.isArray(posData) ? posData : []);
    const map: Record<string, HiringRow> = {};
    for (const row of (hireData.rows ?? [])) map[row.position_id] = row;
    setHiring(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        department: form.department,
        headcount_target: form.headcount_target === '' ? null : Number(form.headcount_target),
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', department: '', headcount_target: '' });
    load();
  }

  async function saveTarget(id: string) {
    await fetch(`/api/positions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headcount_target: editTarget === '' ? null : Number(editTarget) }),
    });
    setEditId(null);
    setEditTarget('');
    load();
  }

  const s = {
    page: { padding: 32, maxWidth: 920 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    h1: { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    btn: { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer' },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f4f2ee' },
    form: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 20 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 },
    openBadge: { background: '#fae9e7', color: '#c0392b', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 },
    fullBadge: { background: '#e8f3ec', color: '#16794a', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 },
    targetBtn: { background: '#f4f2ee', color: '#6b6760', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #e9e4da', cursor: 'pointer' },
    input: { padding: '6px 8px', border: '1px solid #ddd8cd', borderRadius: 6, fontSize: 13, width: 64 },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Positions <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({positions.length})</span></h1>
        <button style={s.btn} onClick={() => setShowForm(p => !p)}>+ Add position</button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Add position</div>
          <div style={s.grid}>
            <div>
              <label style={{ fontSize: 12, color: '#6b6760' }}>Job title</label>
              <input required placeholder="Front Desk Agent" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                style={{ ...s.input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b6760' }}>Department</label>
              <input placeholder="Front Office" value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                style={{ ...s.input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b6760' }}>Headcount target</label>
              <input type="number" min={0} placeholder="e.g. 5" value={form.headcount_target}
                onChange={e => setForm(p => ({ ...p, headcount_target: e.target.value }))}
                style={{ ...s.input, width: '100%' }} />
              <div style={{ fontSize: 10, color: '#a8a39a', marginTop: 3 }}>Desired # of active staff in this role</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Saving…' : 'Add position'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : positions.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No positions yet.</div>
          : positions.map((pos, i) => {
              const h = hiring[pos.id];
              const hasTarget = pos.headcount_target != null;
              return (
                <div key={pos.id} style={{ ...s.row, ...(i === positions.length - 1 ? { borderBottom: 'none' } : {}) }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {pos.title}
                      {h && h.open > 0 && <span style={s.openBadge}>{h.open} open</span>}
                      {h && hasTarget && h.open === 0 && <span style={s.fullBadge}>Fully staffed</span>}
                    </div>
                    {pos.department && <div style={{ fontSize: 12, color: '#6b6760', marginTop: 2 }}>{pos.department}</div>}
                    {hasTarget && h && (
                      <div style={{ fontSize: 11, color: '#a8a39a', marginTop: 4 }}>
                        {h.filled} of {h.target} filled
                      </div>
                    )}
                  </div>
                  <div>
                    {editId === pos.id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" min={0} value={editTarget} placeholder="none"
                          onChange={e => setEditTarget(e.target.value)} style={s.input} />
                        <button onClick={() => saveTarget(pos.id)} style={s.btn}>Save</button>
                        <button onClick={() => setEditId(null)} style={s.targetBtn}>Cancel</button>
                      </span>
                    ) : (
                      <button style={s.targetBtn}
                        onClick={() => { setEditId(pos.id); setEditTarget(pos.headcount_target?.toString() ?? ''); }}>
                        {hasTarget ? `Target: ${pos.headcount_target}` : 'Set target'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
