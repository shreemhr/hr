'use client';
import { useState, useEffect } from 'react';
import { ROLE_LABELS } from '@/lib/constants';
import { isBlank, isValidEmail, firstError } from '@/lib/validate';
import Toast, { ToastState } from '@/components/Toast';

interface UserRow   { id: string; name: string; email: string; role: string; property_ids: string[]; status: string; temp_password?: string; }
interface Property  { id: string; name: string; }

export default function UsersPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [newPass, setNewPass]     = useState('');
  const [form, setForm]           = useState({ name: '', email: '', role: 'hr' as string, propertyIds: [] as string[] });
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [formError, setFormError] = useState('');
  const [shake, setShake]         = useState(0);
  const [toast, setToast]         = useState<ToastState | null>(null);

  const load = async () => {
    const [ud, pd] = await Promise.all([fetch('/api/users').then(r => r.json()), fetch('/api/properties').then(r => r.json())]);
    setUsers(Array.isArray(ud) ? ud : []); setProperties(Array.isArray(pd) ? pd : []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const needsProps = form.role === 'gm' || form.role === 'hr';

  function toggleProp(id: string) {
    setForm(p => ({ ...p, propertyIds: p.propertyIds.includes(id) ? p.propertyIds.filter(x => x !== id) : [...p.propertyIds, id] }));
  }

  function validate(): string | null {
    return firstError([
      [isBlank(form.name), 'Name is required.'],
      [isBlank(form.email), 'Email is required.'],
      [!isBlank(form.email) && !isValidEmail(form.email), 'Enter a valid email address.'],
      [needsProps && form.propertyIds.length === 0, 'Assign at least one property for this role.'],
    ]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); setShake(s => s + 1); return; }

    setSaving(true); setFormError('');
    try {
      const res  = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to invite user.'); setShake(s => s + 1);
        return;
      }
      if (data.tempPassword) setNewPass(data.tempPassword);
      setShowForm(false); setForm({ name: '', email: '', role: 'hr', propertyIds: [] });
      setToast({ message: 'User invited successfully.', type: 'success' });
      load();
    } catch {
      setFormError('Network error — please try again.'); setShake(s => s + 1);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, status: string) {
    const res = await fetch(`/api/users`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: status === 'active' ? 'inactive' : 'active' }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? 'Failed to update user.', type: 'error' });
      return;
    }
    setToast({ message: status === 'active' ? 'User deactivated.' : 'User activated.', type: 'success' });
    load();
  }

  const s = {
    page:  { padding: 32, maxWidth: 900 },
    head:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    h1:    { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    btn:   { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8 },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    row:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f4f2ee' },
    form:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 20 },
    grid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    toast: { background: '#e8f3ec', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 20px', marginBottom: 20, color: '#15803d' },
    err:   { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    chips: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 8 },
    chip:  (a: boolean) => ({ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${a ? '#4f46e5' : '#e9e4da'}`, background: a ? '#eef2ff' : '#faf8f4', color: a ? '#4f46e5' : '#6b6760' }),
  } as const;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (ROLE_LABELS[u.role] ?? u.role).toLowerCase().includes(q);
  });

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Users <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({users.length})</span></h1>
        <button style={s.btn} onClick={() => setShowForm(p => !p)}>+ Invite user</button>
      </div>

      {users.length > 0 && (
        <div className="search-box">
          <input placeholder="Search by name, email, or role…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {newPass && (
        <div style={s.toast}>
          ✅ User invited! Temporary password: <strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{newPass}</strong>
          <span style={{ color: '#6b6760', display: 'block', fontSize: 12, marginTop: 4 }}>Share this once — user will be required to reset on first login.</span>
          <button onClick={() => setNewPass('')} style={{ background: 'transparent', color: '#6b6760', fontSize: 12, padding: '4px 0', border: 'none', cursor: 'pointer', marginTop: 4 }}>Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Invite user</div>
          {formError && <div key={shake} style={s.err} className="animate-shake">{formError}</div>}
          <div style={s.grid}>
            <div><label>Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, propertyIds: [] }))}>
                <option value="owner">Owner</option>
                <option value="vp_ops">VP Operations</option>
                <option value="gm">General Manager</option>
                <option value="hr">HR</option>
              </select>
            </div>
          </div>
          {needsProps && (
            <div style={{ marginBottom: 18 }}>
              <label>Assign to properties</label>
              <div style={s.chips}>
                {properties.map(pr => (
                  <span key={pr.id} style={s.chip(form.propertyIds.includes(pr.id))} onClick={() => toggleProp(pr.id)}>{pr.name}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Inviting…' : 'Send invite'}</button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : users.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No users yet.</div>
          : filtered.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No users match &quot;{search}&quot;.</div>
          : filtered.map((u, i) => (
            <div key={u.id} className="card-hover" style={{ ...s.row, ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}), opacity: u.status === 'inactive' ? 0.6 : 1 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#6b6760', marginTop: 2 }}>{u.email} · {ROLE_LABELS[u.role] ?? u.role}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: u.status === 'active' ? '#e8f3ec' : '#f4f2ee', color: u.status === 'active' ? '#16794a' : '#a8a39a', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>{u.status}</span>
                <button onClick={() => toggleStatus(u.id, u.status)} style={{ background: '#f4f2ee', color: '#6b6760', fontSize: 12, padding: '5px 10px', borderRadius: 6, fontWeight: 600 }}>
                  {u.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        }
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
