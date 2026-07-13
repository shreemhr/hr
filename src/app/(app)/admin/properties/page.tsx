'use client';
import { useState, useEffect } from 'react';
import { US_STATES, STATE_NOTES } from '@/lib/stateforms';
import { isBlank, firstError } from '@/lib/validate';
import Toast, { ToastState } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Property { id: string; name: string; state: string; city: string; brand?: string; is_marriott: boolean; }

const EMPTY_FORM = { name: '', city: '', state: 'TX', brand: '', is_marriott: false };

export default function PropertiesPage() {
  const [props, setProps]     = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [formError, setFormError] = useState('');
  const [shake, setShake]     = useState(0);
  const [toast, setToast]     = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => fetch('/api/properties').then(r => r.json()).then(d => { setProps(Array.isArray(d) ? d : []); setLoading(false); });
  useEffect(() => { load(); }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(p: Property) {
    setEditingId(p.id);
    setForm({ name: p.name, city: p.city ?? '', state: p.state, brand: p.brand ?? '', is_marriott: p.is_marriott });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function validate(): string | null {
    return firstError([
      [isBlank(form.name), 'Property name is required.'],
      [isBlank(form.city), 'City is required.'],
      [isBlank(form.state) || form.state.trim().length !== 2, 'State must be a 2-letter code.'],
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); setShake(s => s + 1); return; }

    setSaving(true); setFormError('');
    try {
      const res = await fetch(editingId ? `/api/properties/${editingId}` : '/api/properties', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Something went wrong.'); setShake(s => s + 1);
        return;
      }
      closeForm();
      setToast({ message: editingId ? 'Property updated successfully.' : 'Property added successfully.', type: 'success' });
      load();
    } catch {
      setFormError('Network error — please try again.'); setShake(s => s + 1);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ message: data.error ?? 'Failed to delete property.', type: 'error' });
      } else {
        setToast({ message: `${deleteTarget.name} deleted.`, type: 'success' });
        load();
      }
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
    err:  { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    iconBtn: { background: '#f4f2ee', color: '#6b6760', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 13, cursor: 'pointer' },
  } as const;

  const stateNote = STATE_NOTES[form.state];
  const filtered = props.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.state.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
  });

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Properties <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({props.length})</span></h1>
        <button style={s.btn} onClick={() => (showForm ? closeForm() : openAddForm())}>{showForm ? 'Close' : '+ Add property'}</button>
      </div>

      {props.length > 0 && (
        <div className="search-box">
          <input placeholder="Search by name, city, state, or brand…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>{editingId ? 'Edit property' : 'Add property'}</div>
          {formError && <div key={shake} style={s.err} className="animate-shake">{formError}</div>}
          <div style={s.grid}>
            <div><label>Property name</label><input placeholder="Hampton Inn Irving" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label>City</label><input placeholder="Irving" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
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
            <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add property'}</button>
            <button type="button" onClick={closeForm} style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : props.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No properties yet. Add your first hotel.</div>
          : filtered.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No properties match &quot;{search}&quot;.</div>
          : filtered.map((p, i) => (
            <div key={p.id} className="card-hover" style={{ ...s.row, ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}) }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1b22' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#6b6760', marginTop: 2 }}>{p.city}, {p.state} {p.brand ? `· ${p.brand}` : ''} {p.is_marriott ? '· MGS login' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: '#f4f2ee', color: '#6b6760', borderRadius: 999, fontSize: 11, fontWeight: 600, padding: '3px 10px' }}>{p.state}</span>
                <button type="button" style={s.iconBtn} title="Edit" aria-label="Edit" onClick={() => openEditForm(p)}>✏️</button>
                <button type="button" style={s.iconBtn} title="Delete" aria-label="Delete" onClick={() => setDeleteTarget(p)}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete property?"
        message={`This will permanently delete "${deleteTarget?.name}". This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
