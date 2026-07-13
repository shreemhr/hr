'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Template {
  id: string; name: string; description: string | null; category: string;
  item_count: number; assignment_count: number; active: boolean; created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general:     'General',
  equipment:   'Equipment',
  orientation: 'Orientation',
  training:    'Training',
  uniform:     'Uniform & Appearance',
  keys:        'Keys & Access',
};

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    fetch('/api/checklists').then(r => r.json()).then(d => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || (CATEGORY_LABELS[t.category] ?? t.category).toLowerCase().includes(q);
  });

  const s = {
    page:  { padding: 32, maxWidth: 900 },
    head:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    h1:    { fontSize: 24, fontWeight: 800, color: '#1c1b22', margin: 0 },
    btn:   { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: '18px 22px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 20, textDecoration: 'none', color: 'inherit' },
    name:  { fontWeight: 700, fontSize: 15, color: '#1c1b22' },
    meta:  { color: '#6b6760', fontSize: 13, marginTop: 3 },
    badge: { background: '#f4f2ee', color: '#6b6760', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
    cat:   { background: '#eef2ff', color: '#4f46e5', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
    empty: { padding: 64, textAlign: 'center' as const, color: '#a8a39a', background: '#fff', border: '1px solid #e9e4da', borderRadius: 12 },
  };

  return (
    <div style={s.page}>
      <div style={s.head}>
        <div>
          <h1 style={s.h1}>Checklist Templates</h1>
          <p style={{ color: '#6b6760', fontSize: 14, marginTop: 4 }}>
            Reusable checklists for equipment, orientation, keys, and more.
          </p>
        </div>
        <Link href="/admin/checklists/new" style={s.btn}>+ New Template</Link>
      </div>

      {loading && <div style={{ color: '#6b6760', padding: 24 }}>Loading…</div>}

      {!loading && templates.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No templates yet</div>
          <div style={{ marginBottom: 20 }}>Create your first checklist template to track equipment, orientation tasks, and more.</div>
          <Link href="/admin/checklists/new" style={{ ...s.btn, display: 'inline-block' }}>+ New Template</Link>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="search-box">
          <input placeholder="Search by name or category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {!loading && templates.length > 0 && filtered.length === 0 && (
        <div style={s.empty}>No templates match &quot;{search}&quot;.</div>
      )}

      {filtered.map(t => (
        <Link key={t.id} href={`/admin/checklists/${t.id}`} style={s.card} className="card-hover">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={s.name}>{t.name}</span>
              {!t.active && <span style={{ background: '#f4f2ee', color: '#a8a39a', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Archived</span>}
            </div>
            {t.description && <div style={s.meta}>{t.description}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={s.cat}>{CATEGORY_LABELS[t.category] ?? t.category}</span>
            <span style={s.badge}>{t.item_count} items</span>
            <span style={s.badge}>{t.assignment_count} assigned</span>
          </div>
          <div style={{ color: '#a8a39a', fontSize: 18 }}>›</div>
        </Link>
      ))}
    </div>
  );
}
