'use client';
import { useState, useEffect } from 'react';
import { isBlank } from '@/lib/validate';
import Toast, { ToastState } from '@/components/Toast';

export default function SettingsPage() {
  const [form, setForm] = useState({ name: '', legal_name: '', ein: '', primary_color: '#4f46e5' });
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetch('/api/company/settings')
      .then(async r => {
        if (!r.ok) { setLoadError(true); return; }
        const d = await r.json();
        setForm({ name: d.name || '', legal_name: d.legal_name || '', ein: d.ein || '', primary_color: d.primary_color || '#4f46e5' });
        setPlan(d.plan || '');
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  function validate(): string | null {
    if (isBlank(form.name)) return 'Display name is required.';
    if (form.ein && !/^\d{2}-?\d{7}$/.test(form.ein.trim())) return 'EIN must be in the format XX-XXXXXXX.';
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); setShake(s => s + 1); return; }

    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/company/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to save settings.'); setShake(s => s + 1);
        return;
      }
      setToast({ message: 'Settings saved successfully.', type: 'success' });
    } catch {
      setFormError('Network error — please try again.'); setShake(s => s + 1);
    } finally {
      setSaving(false);
    }
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
    err:   { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 18, fontSize: 13 },
  } as const;

  if (loading) return <div style={{ padding: 40, color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ padding: 40, color: '#c0392b' }}>Failed to load settings — please refresh and try again.</div>;

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Settings</h1>
      <p style={s.sub}>Company details, branding, and plan information.</p>

      <form onSubmit={handleSave}>
        {formError && <div key={shake} style={s.err} className="animate-shake">{formError}</div>}
        <div style={s.card}>
          <div style={s.sHead}>Company details</div>
          <div style={s.row}>
            <div><label>Display name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label>Legal entity name</label><input value={form.legal_name} onChange={e => setForm(p => ({ ...p, legal_name: e.target.value }))} /></div>
          </div>
          <div style={s.field}><label>EIN <span style={{ color: '#a8a39a', fontWeight: 400 }}>(appears on offer letters)</span></label><input placeholder="XX-XXXXXXX" value={form.ein} onChange={e => setForm(p => ({ ...p, ein: e.target.value }))} /></div>
          <div style={s.field}><label>Brand color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} style={{ width: 48, height: 36, padding: 2 }} />
              <input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} style={{ width: 120 }} />
            </div>
          </div>
        </div>

        <div style={s.card} id="billing">
          <div style={s.sHead}>Plan &amp; billing</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ background: '#eef2ff', color: '#4f46e5', fontWeight: 700, padding: '4px 12px', borderRadius: 999, fontSize: 13 }}>
              {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—'}
            </span>
          </div>
          <p style={{ color: '#6b6760', fontSize: 13 }}>Stripe billing coming in Phase 6. Contact us to upgrade or change your plan.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button type="submit" style={s.btn} disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
