'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Property { id: string; name: string; state: string; }
interface Position { id: string; title: string; property_ids: string[]; }

export default function NewEmployeePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [positions,  setPositions]  = useState<Position[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', hireDate: '', propertyId: '', positionId: '', payRate: '', payType: 'hourly', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/properties').then(r => r.json()), fetch('/api/positions').then(r => r.json())])
      .then(([pd, posd]) => { setProperties(pd.properties ?? []); setPositions(posd.positions ?? []); });
  }, []);

  const validPositions = positions.filter(p => !p.property_ids?.length || p.property_ids.includes(form.propertyId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res  = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to add employee'); setSaving(false); return; }
    router.push(`/employees/${data.id}`);
  }

  const s = {
    page: { padding: 32, maxWidth: 640 },
    h1:   { fontSize: 22, fontWeight: 800, marginBottom: 4, color: '#1c1b22' },
    sub:  { color: '#6b6760', marginBottom: 28, fontSize: 14 },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 28, marginBottom: 20 },
    sh:   { fontWeight: 700, fontSize: 16, marginBottom: 18 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    err:  { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    btn:  { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '10px 24px', borderRadius: 8 },
  } as const;

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Add employee</h1>
      <p style={s.sub}>New hire information for onboarding and HR records.</p>
      {error && <div style={s.err}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={s.card}>
          <div style={s.sh}>Personal information</div>
          <div style={s.grid}>
            <div><label>First name</label><input required value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} /></div>
            <div><label>Last name</label><input required value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label>Phone</label><input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sh}>Employment details</div>
          <div style={s.grid}>
            <div>
              <label>Property</label>
              <select required value={form.propertyId} onChange={e => setForm(p => ({ ...p, propertyId: e.target.value, positionId: '' }))}>
                <option value="">Select property…</option>
                {properties.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
            </div>
            <div>
              <label>Position</label>
              <select required value={form.positionId} onChange={e => setForm(p => ({ ...p, positionId: e.target.value }))} disabled={!form.propertyId}>
                <option value="">Select position…</option>
                {validPositions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
              </select>
            </div>
            <div><label>Hire date</label><input type="date" required value={form.hireDate} onChange={e => setForm(p => ({ ...p, hireDate: e.target.value }))} /></div>
            <div>
              <label>Pay type</label>
              <select value={form.payType} onChange={e => setForm(p => ({ ...p, payType: e.target.value }))}>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
            </div>
            <div>
              <label>{form.payType === 'hourly' ? 'Hourly rate ($)' : 'Annual salary ($)'}</label>
              <input type="number" step="0.01" required placeholder={form.payType === 'hourly' ? '18.50' : '45000'} value={form.payRate} onChange={e => setForm(p => ({ ...p, payRate: e.target.value }))} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Adding…' : 'Add employee'}</button>
          <button type="button" onClick={() => router.back()} style={{ background: '#f4f2ee', color: '#6b6760', padding: '10px 24px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
