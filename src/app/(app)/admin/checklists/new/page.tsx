'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'general',     label: 'General' },
  { value: 'equipment',   label: 'Equipment' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'training',    label: 'Training' },
  { value: 'uniform',     label: 'Uniform & Appearance' },
  { value: 'keys',        label: 'Keys & Access' },
];

interface Item { title: string; description: string; }

export default function NewChecklistPage() {
  const router  = useRouter();
  const [name,  setName]  = useState('');
  const [desc,  setDesc]  = useState('');
  const [cat,   setCat]   = useState('general');
  const [items, setItems] = useState<Item[]>([{ title: '', description: '' }]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function addItem() { setItems(prev => [...prev, { title: '', description: '' }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, j) => j !== i)); }
  function updateItem(i: number, field: 'title' | 'description', val: string) {
    setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: val } : item));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    const validItems = items.filter(it => it.title.trim());
    if (validItems.length === 0) { setError('Add at least one item.'); return; }

    setSaving(true); setError('');
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, category: cat, items: validItems }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Save failed.'); setSaving(false); return; }
    router.push(`/admin/checklists/${data.id}`);
  }

  const s = {
    page:   { padding: 32, maxWidth: 700 },
    h1:     { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 28px' },
    card:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 16 },
    sh:     { fontWeight: 700, fontSize: 15, color: '#1c1b22', marginBottom: 16 },
    label:  { display: 'block', fontSize: 13, fontWeight: 600, color: '#34313d', marginBottom: 6 },
    input:  { width: '100%', padding: '9px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' },
    itemRow:{ border: '1px solid #e9e4da', borderRadius: 8, padding: 14, marginBottom: 10, background: '#faf8f4' },
    rmBtn:  { background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 18, padding: '0 4px', float: 'right' as const },
    addBtn: { background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid #e9e4da', cursor: 'pointer', width: '100%', fontSize: 14, marginTop: 4 },
    footer: { display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' },
    saveBtn:{ background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15 },
    cancel: { color: '#6b6760', textDecoration: 'none', fontSize: 14 },
    err:    { background: '#fae9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  };

  return (
    <div style={s.page}>
      <Link href="/admin/checklists" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Checklist Templates</Link>
      <h1 style={s.h1}>New Checklist Template</h1>

      {error && <div style={s.err}>{error}</div>}

      <div style={s.card}>
        <div style={s.sh}>Template Details</div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Template Name *</label>
          <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Hire Equipment" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Description</label>
          <input style={s.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
        </div>
        <div>
          <label style={s.label}>Category</label>
          <select style={s.select} value={cat} onChange={e => setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.sh}>Checklist Items</div>
        {items.map((item, i) => (
          <div key={i} style={s.itemRow}>
            <button style={s.rmBtn} onClick={() => removeItem(i)} type="button" title="Remove">×</button>
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...s.label, fontSize: 12 }}>Item {i + 1} Title *</label>
              <input
                style={s.input}
                value={item.title}
                onChange={e => updateItem(i, 'title', e.target.value)}
                placeholder="e.g. Uniform issued"
              />
            </div>
            <div>
              <label style={{ ...s.label, fontSize: 12 }}>Notes / Instructions (optional)</label>
              <input
                style={s.input}
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
                placeholder="e.g. Issue 2 sets: black pants, logo shirt, name tag"
              />
            </div>
          </div>
        ))}
        <button style={s.addBtn} onClick={addItem} type="button">+ Add Item</button>
      </div>

      <div style={s.footer}>
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create Template'}
        </button>
        <Link href="/admin/checklists" style={s.cancel}>Cancel</Link>
      </div>
    </div>
  );
}
