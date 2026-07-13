'use client';
import { useState, useEffect } from 'react';
import { US_STATES, STATE_NOTES } from '@/lib/stateforms';

interface Property { id: string; name: string; state: string; city: string; brand?: string; is_marriott: boolean; }

export default function PropertiesPage() {
  const [props, setProps]     = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ name: '', city: '', state: 'TX', brand: '', is_marriott: false });
  const [saving, setSaving]   = useState(false);

  const load = () => fetch('/api/properties').then(r => r.json()).then(d => { setProps(d.properties ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setShowForm(false); setForm({ name: '', city: '', state: 'TX', brand: '', is_marriott: false }); load();
  }

  const s = {
    page: { padding: 32, maxWidth: 900 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    h1:   { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    btn:  { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8 },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    row:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f4f2ee' },
    form: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 20 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    note: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  } as const;

  const stateNote = STATE_NOTES[form.state];

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Properties <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({props.length})</span></h1>
        <button style={s.btn} onClick={() => setShowForm(p => !p)}>+ Add property</button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Add property</div>
          <div style={s.grid}>
            <div><label>Property name</label><input required placeholder="Hampton Inn Irving" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label>City</label><input required placeholder="Irving" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            <div>
              <label>State</label>
              <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div><label>Brand / flag</label><input placeholder="Hilton, Marriott, Independent…" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} /></div>
          </div>
          {stateNote && <div style={s.note}>ℹ️ {stateNote}</div>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer', fontWeight: 400 }}>
            <input type="checkbox" checked={form.is_marriott} onChange={e => setForm(p => ({ ...p, is_marriott: e.target.checked }))} style={{ width: 'auto' }} />
            Marriott / MGS login required for onboarding
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Saving…' : 'Add property'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : props.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No properties yet. Add your first hotel.</div>
          : props.map((p, i) => (
            <div key={p.id} style={{ ...s.row, ...(i === props.length - 1 ? { borderBottom: 'none' } : {}) }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1b22' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#6b6760', marginTop: 2 }}>{p.city}, {p.state} {p.brand ? `· ${p.brand}` : ''} {p.is_marriott ? '· MGS login' : ''}</div>
              </div>
              <span style={{ background: '#f4f2ee', color: '#6b6760', borderRadius: 999, fontSize: 11, fontWeight: 600, padding: '3px 10px' }}>{p.state}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
