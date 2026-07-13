'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DocRow {
  id:             string;
  employee_id:    string;
  employee_name:  string;
  property_name:  string;
  type:           string;
  title:          string;
  generated_at:   string;
}
interface EmpRow { id: string; first_name: string; last_name: string; property_name: string; }

export default function DocumentsPage() {
  const [docs, setDocs]         = useState<DocRow[]>([]);
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/documents/offer-letter/list').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([dd, ed]) => {
      setDocs(Array.isArray(dd) ? dd : []); setEmployees(Array.isArray(ed) ? ed : []); setLoading(false);
    });
  }, []);

  const filtered = docs.filter(d => d.employee_name?.toLowerCase().includes(search.toLowerCase()) || d.property_name?.toLowerCase().includes(search.toLowerCase()));

  const s = {
    page:  { padding: 32, maxWidth: 960 },
    head:  { marginBottom: 24 },
    h1:    { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub:   { color: '#6b6760', marginTop: 4, fontSize: 14 },
    grid:  { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'flex-start' },
    panel: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24 },
    sh:    { fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#1c1b22' },
    empRow:(last: boolean) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #f4f2ee' }),
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden', marginTop: 0 },
    hdr:   { display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px', gap: 0, padding: '10px 20px', background: '#faf8f4', borderBottom: '1px solid #e9e4da', fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    row:   { display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px', gap: 0, padding: '14px 20px', borderBottom: '1px solid #f4f2ee', alignItems: 'center' },
    btnSm: { fontSize: 12, color: '#4f46e5', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' as const },
    badge: { background: '#eef2ff', color: '#4f46e5', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Documents</h1>
        <p style={s.sub}>Generate and manage offer letters. More document types coming in future phases.</p>
      </div>

      <div style={s.grid}>
        {/* Left: Generate for an employee */}
        <div style={s.panel}>
          <div style={s.sh}>📄 Generate offer letter</div>
          <p style={{ fontSize: 13, color: '#6b6760', marginBottom: 16 }}>Select an employee to generate a professional offer letter pre-filled with their position and pay details.</p>
          {loading
            ? <div style={{ color: '#a8a39a', fontSize: 13 }}>Loading…</div>
            : employees.slice(0, 10).map((e, i) => (
              <div key={e.id} style={s.empRow(i === Math.min(employees.length - 1, 9))}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{e.first_name} {e.last_name}</div>
                  <div style={{ fontSize: 11, color: '#a8a39a' }}>{e.property_name}</div>
                </div>
                <Link href={`/documents/offer-letter/${e.id}`} style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>Open →</Link>
              </div>
            ))
          }
          {employees.length > 10 && <div style={{ fontSize: 12, color: '#a8a39a', marginTop: 8 }}>…and {employees.length - 10} more. Search by name above.</div>}
          {!loading && employees.length === 0 && <div style={{ fontSize: 13, color: '#a8a39a' }}>No employees yet. <Link href="/employees/new">Add an employee →</Link></div>}
        </div>

        {/* Right: Recent offer letters */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <input placeholder="Search by employee or property…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={s.card}>
            <div style={s.hdr}><span>Employee</span><span>Property</span><span>Generated</span><span>Action</span></div>
            {loading
              ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
              : filtered.length === 0
                ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>
                    {docs.length === 0 ? 'No offer letters generated yet.' : 'No results.'}
                  </div>
                : filtered.map((d, i) => (
                  <div key={d.id} style={{ ...s.row, ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}) }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{d.employee_name}</span>
                    <span style={{ color: '#6b6760', fontSize: 13 }}>{d.property_name}</span>
                    <span style={{ color: '#a8a39a', fontSize: 12 }}>
                      {new Date(d.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/documents/offer-letter/${d.employee_id}`} style={{ ...s.btnSm }}>View</Link>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
