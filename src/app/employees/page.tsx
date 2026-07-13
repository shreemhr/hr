'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Employee {
  id: string; first_name: string; last_name: string;
  pay_rate: number | null; pay_type?: string; status: string; hire_date: string | null;
  position_id: string | null;
  positions?: { title: string } | null;
  properties?: { name: string } | null;
}

function EmployeesInner() {
  const params = useSearchParams();
  const positionId = params.get('position_id');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(d => {
        const list: Employee[] = Array.isArray(d) ? d : (d.employees ?? []);
        setEmployees(list);
        if (positionId) {
          const match = list.find(e => e.position_id === positionId);
          setFilterTitle(match?.positions?.title ?? 'this role');
        }
        setLoading(false);
      });
  }, [positionId]);

  const filtered = employees.filter(e => {
    if (positionId && e.position_id !== positionId) return false;
    const title = e.positions?.title ?? '';
    const prop = e.properties?.name ?? '';
    return `${e.first_name} ${e.last_name} ${title} ${prop}`.toLowerCase().includes(search.toLowerCase());
  });

  const s = {
    page: { padding: 32, maxWidth: 1000 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    h1: { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    btn: { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' },
    srch: { marginBottom: 16 },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, overflow: 'hidden' },
    hdr: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 80px', padding: '10px 20px', background: '#faf8f4', borderBottom: '1px solid #e9e4da', fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    row: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 80px', padding: '14px 20px', borderBottom: '1px solid #f4f2ee', alignItems: 'center' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Employees <span style={{ fontWeight: 400, color: '#6b6760', fontSize: 16 }}>({filtered.length})</span></h1>
        <Link href="/employees/new" style={s.btn}>+ Add employee</Link>
      </div>

      {positionId && filterTitle && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#4f46e5' }}>
          Filtered to <strong>{filterTitle}</strong> · <Link href="/employees" style={{ color: '#6b6760' }}>clear</Link>
        </div>
      )}

      <div style={s.srch}>
        <input placeholder="Search by name, position, or property…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={s.card}>
        <div style={s.hdr}><span>Name</span><span>Position</span><span>Property</span><span>Pay</span><span>Status</span></div>
        {loading ? <div style={{ padding: 24, color: '#6b6760' }}>Loading…</div>
          : filtered.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#a8a39a' }}>{search || positionId ? 'No results.' : 'No employees yet. Add your first.'}</div>
          : filtered.map((e, i) => (
            <Link key={e.id} href={`/employees/${e.id}`} style={{ ...s.row, textDecoration: 'none', color: 'inherit', ...(i === filtered.length - 1 ? { borderBottom: 'none' } : {}) }}>
              <span style={{ fontWeight: 600, color: '#1c1b22' }}>{e.first_name} {e.last_name}</span>
              <span style={{ color: '#6b6760', fontSize: 13 }}>{e.positions?.title ?? '—'}</span>
              <span style={{ color: '#6b6760', fontSize: 13 }}>{e.properties?.name ?? '—'}</span>
              <span style={{ color: '#6b6760', fontSize: 13 }}>
                {e.pay_rate != null ? (e.pay_type === 'hourly' ? `$${Number(e.pay_rate).toFixed(2)}/hr` : `$${Number(e.pay_rate).toLocaleString()}/yr`) : '—'}
              </span>
              <span style={{ background: e.status === 'active' ? '#e8f3ec' : '#f4f2ee', color: e.status === 'active' ? '#16794a' : '#a8a39a', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 10px', display: 'inline-block' }}>{e.status}</span>
            </Link>
          ))
        }
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><EmployeesInner /></Suspense>;
}
