'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TemplateItem { id: string; title: string; description: string | null; sort_order: number; }
interface Assignment {
  id: string;
  employee: { id: string; first_name: string; last_name: string; properties: { name: string } | null };
  assigned_at: string;
  completion: { done: number; total: number; pct: number };
}

export default function ChecklistDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [template,     setTemplate]     = useState<{ id: string; name: string; description: string | null; category: string; active: boolean } | null>(null);
  const [items,        setItems]        = useState<TemplateItem[]>([]);
  const [assignments,  setAssignments]  = useState<Assignment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc,  setNewItemDesc]  = useState('');
  const [addingItem,   setAddingItem]   = useState(false);
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    const [tRes, aRes] = await Promise.all([
      fetch(`/api/checklists/${id}`).then(r => r.json()),
      fetch(`/api/checklists/${id}/assign`).then(r => r.json()).catch(() => []),
    ]);
    setTemplate(tRes.template);
    setItems(tRes.items ?? []);
    setAssignments(aRes);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!newItemTitle.trim()) return;
    setAddingItem(true);
    await fetch(`/api/checklists/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newItemTitle.trim(), description: newItemDesc.trim() || null }),
    });
    setNewItemTitle(''); setNewItemDesc('');
    await load();
    setAddingItem(false);
  }

  async function toggleActive() {
    setSaving(true);
    await fetch(`/api/checklists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !template?.active }),
    });
    await load();
    setSaving(false);
  }

  const s = {
    page:   { padding: 32, maxWidth: 900 },
    head:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    h1:     { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub:    { color: '#6b6760', fontSize: 13, marginTop: 4 },
    grid:   { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' },
    card:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 22, marginBottom: 16 },
    sh:     { fontWeight: 700, fontSize: 14, color: '#1c1b22', marginBottom: 14 },
    label:  { display: 'block', fontSize: 12, fontWeight: 600, color: '#34313d', marginBottom: 5 },
    input:  { width: '100%', padding: '8px 10px', border: '1px solid #ddd8cd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' },
    addBtn: { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 },
    row:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f4f2ee' },
    empRow: { padding: '10px 0', borderBottom: '1px solid #f4f2ee' },
    bar:    { height: 4, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', marginTop: 4 },
    arc:    { background: '#f4f2ee', color: '#a8a39a', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
  };

  if (loading) return <div style={{ padding: 32, color: '#6b6760' }}>Loading…</div>;
  if (!template) return <div style={{ padding: 32, color: '#c0392b' }}>Template not found.</div>;

  return (
    <div style={s.page}>
      <Link href="/admin/checklists" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Checklist Templates</Link>

      <div style={s.head}>
        <div>
          <h1 style={s.h1}>
            {template.name}
            {!template.active && <span style={{ ...s.arc, marginLeft: 10 }}>Archived</span>}
          </h1>
          {template.description && <div style={s.sub}>{template.description}</div>}
        </div>
        <button
          onClick={toggleActive}
          disabled={saving}
          style={{ background: template.active ? '#fae9e7' : '#e8f3ec', color: template.active ? '#c0392b' : '#16794a', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          {template.active ? 'Archive' : 'Restore'}
        </button>
      </div>

      <div style={s.grid}>
        {/* Left: items */}
        <div>
          <div style={s.card}>
            <div style={s.sh}>Checklist Items ({items.length})</div>
            {items.map((item, i) => (
              <div key={item.id} style={{ ...s.row, borderBottom: i === items.length - 1 ? 'none' : undefined }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, border: '2px solid #ddd8cd', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1b22' }}>{item.title}</div>
                  {item.description && <div style={{ fontSize: 12, color: '#6b6760', marginTop: 2 }}>{item.description}</div>}
                </div>
              </div>
            ))}

            {/* Add item form */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f4f2ee' }}>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>New Item</label>
                <input style={s.input} value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Item title" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Notes (optional)</label>
                <input style={s.input} value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="Instructions or details" />
              </div>
              <button style={s.addBtn} onClick={addItem} disabled={addingItem || !newItemTitle.trim()}>
                {addingItem ? 'Adding…' : '+ Add Item'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: assignments */}
        <div>
          <div style={s.card}>
            <div style={s.sh}>Assigned to {assignments.length} employee{assignments.length !== 1 ? 's' : ''}</div>
            {assignments.length === 0 && (
              <div style={{ color: '#a8a39a', fontSize: 13, textAlign: 'center' as const, padding: '20px 0' }}>
                No employees assigned yet.<br />
                Assign this template from an employee's profile.
              </div>
            )}
            {assignments.map((a, i) => {
              const { done, total, pct } = a.completion;
              return (
                <div key={a.id} style={{ ...s.empRow, borderBottom: i === assignments.length - 1 ? 'none' : undefined }}>
                  <Link href={`/employees/${a.employee.id}`} style={{ fontWeight: 600, fontSize: 13, color: '#4f46e5', textDecoration: 'none' }}>
                    {a.employee.first_name} {a.employee.last_name}
                  </Link>
                  <div style={{ fontSize: 11, color: '#a8a39a', marginTop: 2 }}>{a.employee.properties?.name ?? '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6760', marginTop: 6 }}>
                    <span>{done}/{total} complete</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={s.bar}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
