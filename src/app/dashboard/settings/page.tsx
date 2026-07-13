'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [form, setForm] = useState({ name: '', legalName: '', ein: '', primaryColor: '#4f46e5', plan: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/company/settings').then(r => r.json()).then(d => {
      if (d.company) setForm(p => ({ ...p, name: d.company.name || '', legalName: d.company.legal_name || '', ein: d.company.ein || '', primaryColor: d.company.primary_color || '#4f46e5', plan: d.company.plan || '' }));
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/company/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  const s = {
    page:  { padding: 32, maxWidth: 640 },
    h1:    { fontSize: 22, fontWeight: 800, marginBottom: 4, color: '#1c1b22' },
    sub:   { color: '#6b6760', marginBottom: 28, fontSize: 14 },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 28, marginBottom: 20 },
    sHead: { fontWeight: 700, fontSize: 16, marginBottom: 18, color: '#1c1b22' },
    field: { marginBottom: 18 },
    row:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 },
    btn:   { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '10px 24px', borderRadius: 8 },
    saved: { color: '#16794a', fontWeight: 600, marginLeft: 14, fontSize: 14 },
  } as const;

  if (loading) return <div style={{ padding: 40, color: '#6b6760' }}>Loading…</div>;

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Settings</h1>
      <p style={s.sub}>Company details, branding, and plan information.</p>

      <form onSubmit={handleSave}>
        <div style={s.card}>
          <div style={s.sHead}>Company details</div>
          <div style={s.row}>
            <div><label>Display name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label>Legal entity name</label><input value={form.legalName} onChange={e => setForm(p => ({ ...p, legalName: e.target.value }))} /></div>
          </div>
          <div style={s.field}><label>EIN <span style={{ color: '#a8a39a', fontWeight: 400 }}>(appears on offer letters)</span></label><input placeholder="XX-XXXXXXX" value={form.ein} onChange={e => setForm(p => ({ ...p, ein: e.target.value }))} /></div>
          <div style={s.field}><label>Brand color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} style={{ width: 48, height: 36, padding: 2 }} />
              <input value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} style={{ width: 120 }} />
            </div>
          </div>
        </div>

        <div style={s.card} id="billing">
          <div style={s.sHead}>Plan &amp; billing</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ background: '#eef2ff', color: '#4f46e5', fontWeight: 700, padding: '4px 12px', borderRadius: 999, fontSize: 13 }}>
              {form.plan ? form.plan.charAt(0).toUpperCase() + form.plan.slice(1) : '—'}
            </span>
          </div>
          <p style={{ color: '#6b6760', fontSize: 13 }}>Stripe billing coming in Phase 6. Contact us to upgrade or change your plan.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button type="submit" style={s.btn}>Save settings</button>
          {saved && <span style={s.saved}>✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
