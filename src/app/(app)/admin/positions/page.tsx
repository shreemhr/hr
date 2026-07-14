'use client';
import { useState, useEffect } from 'react';
import { isBlank } from '@/lib/validate';
import Toast, { ToastState } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Position {
  id: string;
  title: string;
  department: string | null;
  pay_type?: string;
  pay_rate?: number | null;
  headcount_target: number | null;
  property_ids?: string[];
}
interface HiringRow {
  position_id: string;
  filled: number;
  open: number;
  target: number;
}
interface Property { id: string; name: string; }

const EMPTY_FORM = { title: '', department: '', headcount_target: '', propertyIds: [] as string[] };

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [hiring, setHiring] = useState<Record<string, HiringRow>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [posData, hireData, propData] = await Promise.all([
      fetch('/api/positions').then(r => r.json()),
      fetch('/api/reports/hiring').then(r => r.json()).catch(() => ({ rows: [] })),
      fetch('/api/properties').then(r => r.json()).catch(() => []),
    ]);
    setPositions(Array.isArray(posData) ? posData : []);
    const map: Record<string, HiringRow> = {};
    for (const row of (hireData.rows ?? [])) map[row.position_id] = row;
    setHiring(map);
    setProperties(Array.isArray(propData) ? propData : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(pos: Position) {
    setEditingId(pos.id);
    setForm({
      title: pos.title,
      department: pos.department ?? '',
      headcount_target: pos.headcount_target?.toString() ?? '',
      propertyIds: pos.property_ids ?? [],
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function toggleProperty(id: string) {
    setForm(p => ({ ...p, propertyIds: p.propertyIds.includes(id) ? p.propertyIds.filter(x => x !== id) : [...p.propertyIds, id] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBlank(form.title)) { setFormError('Job title is required.'); setShake(s => s + 1); return; }

    setSaving(true); setFormError('');
    try {
      const res = await fetch(editingId ? `/api/positions/${editingId}` : '/api/positions', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          department: form.department,
          headcount_target: form.headcount_target === '' ? null : Number(form.headcount_target),
          property_ids: form.propertyIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error ?? 'Failed to save position.'); setShake(s => s + 1); return; }
      closeForm();
      setToast({ message: editingId ? 'Position updated successfully.' : 'Position added successfully.', type: 'success' });
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
      const res = await fetch(`/api/positions/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ message: data.error ?? 'Failed to delete position.', type: 'error' });
      } else {
        setToast({ message: `${deleteTarget.title} deleted.`, type: 'success' });
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
    targetBadge: { background: '#f4f2ee', color: '#6b6760', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 },
    scopeBadge: { background: '#eef2ff', color: '#4f46e5', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 },
    input: { padding: '6px 8px', border: '1px solid #ddd8cd', borderRadius: 6, fontSize: 13, width: 64 },
    err:  { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    iconBtn: { background: '#f4f2ee', color: '#6b6760', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 13, cursor: 'pointer' },
    chips: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 8 },
    chip:  (a: boolean) => ({ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${a ? '#4f46e5' : '#e9e4da'}`, background: a ? '#eef2ff' : '#faf8f4', color: a ? '#4f46e5' : '#6b6760' }),
  } as const;

  const filtered = positions.filter(pos => {
    const q = search.toLowerCase();
    return !q || pos.title.toLowerCase().includes(q) || pos.department?.toLowerCase().includes(q);
  });

  const propertyNames = (ids: string[] | undefined) =>
    (ids ?? []).map(id => properties.find(p => p.id === id)?.name).filter(Boolean).join(', ');

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Positions <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({positions.length})</span></h1>
        <button style={s.btn} onClick={() => (showForm ? closeForm() : openAddForm())}>{showForm ? 'Close' : '+ Add position'}</button>
      </div>

      {positions.length > 0 && (
        <div className="search-box">
          <input placeholder="Search by title or department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>{editingId ? 'Edit position' : 'Add position'}</div>
          {formError && <div key={shake} style={s.err} className="animate-shake">{formError}</div>}
          <div style={s.grid}>
            <div>
              <label style={{ fontSize: 12, color: '#6b6760' }}>Job title</label>
              <input placeholder="Front Desk Agent" value={form.title}
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
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, color: '#6b6760' }}>Property</label>
            {properties.length === 0 ? (
              <div style={{ fontSize: 12, color: '#a8a39a', marginTop: 4 }}>No properties yet — add one in Admin → Properties first.</div>
            ) : (
              <>
                <div style={s.chips}>
                  {properties.map(pr => (
                    <span key={pr.id} style={s.chip(form.propertyIds.includes(pr.id))} onClick={() => toggleProperty(pr.id)}>{pr.name}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#a8a39a', marginTop: 6 }}>
                  {form.propertyIds.length === 0 ? 'None selected — this role will apply to all properties.' : 'This role only appears at the selected properties.'}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add position'}</button>
            <button type="button" onClick={closeForm} style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.card}>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : positions.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No positions yet.</div>
          : filtered.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>No positions match &quot;{search}&quot;.</div>
          : filtered.map((pos, i) => {
              const h = hiring[pos.id];
              const hasTarget = pos.headcount_target != null;
              const scoped = (pos.property_ids ?? []).length > 0;
              return (
                <div key={pos.id} className="card-hover" style={{ ...s.row, ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}) }}>
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
                    {scoped && (
                      <div style={{ fontSize: 11, color: '#a8a39a', marginTop: 4 }}>
                        📍 {propertyNames(pos.property_ids)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasTarget && <span style={s.targetBadge}>Target: {pos.headcount_target}</span>}
                    <span style={s.scopeBadge}>{scoped ? `${pos.property_ids!.length} propert${pos.property_ids!.length === 1 ? 'y' : 'ies'}` : 'All properties'}</span>
                    <button type="button" style={s.iconBtn} title="Edit" aria-label="Edit" onClick={() => openEditForm(pos)}>✏️</button>
                    <button type="button" style={s.iconBtn} title="Delete" aria-label="Delete" onClick={() => setDeleteTarget(pos)}>🗑️</button>
                  </div>
                </div>
              );
            })
        }
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete position?"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
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
