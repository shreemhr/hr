'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Toast, { ToastState } from '@/components/Toast';

interface Employee {
  id: string; first_name: string; last_name: string; pay_rate: number; employment_type?: string;
  positions: { title: string; pay_type: string } | null;
  properties: { name: string; state: string } | null;
}
interface Company { name: string; legal_name: string | null; }

function fmt(dateStr: string) {
  try { return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}

export default function OfferLetterPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [emp, setEmp]       = useState<Employee | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast]     = useState<ToastState | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const [fields, setFields] = useState({
    offerDate:      today,
    startDate:      '',
    employmentType: 'Full-time',
    signerName:     '',
    signerTitle:    'General Manager',
    acceptBy:       '',
    notes:          '',
    customPayRate:  '',
    customPayType:  '' as '' | 'hourly' | 'salary',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/offer-letter/${id}`);
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setEmp(data.employee ?? null);
      setCompany(data.company ?? null);
      if (data.document?.content) {
        setFields(prev => ({ ...prev, ...data.document.content }));
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Generate preview HTML whenever fields or emp change
  useEffect(() => {
    if (!emp || !company) return;
    const payRate = fields.customPayRate || String(emp.pay_rate);
    const payType = (fields.customPayType || emp.positions?.pay_type || 'hourly') as 'hourly' | 'salary';
    fetch('/api/documents/offer-letter/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName:   company.legal_name || company.name,
        propertyName:  emp.properties?.name ?? '',
        employeeFirst: emp.first_name,
        employeeLast:  emp.last_name,
        positionTitle: emp.positions?.title ?? '',
        startDate:     fields.startDate ? fmt(fields.startDate) : 'TBD',
        payRate,
        payType,
        employmentType: fields.employmentType,
        signerName:    fields.signerName || 'General Manager',
        signerTitle:   fields.signerTitle,
        offerDate:     fields.offerDate || today,
        acceptBy:      fields.acceptBy ? fmt(fields.acceptBy) : '',
        notes:         fields.notes,
      })
    })
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(html => setPreviewHtml(html))
      .catch(() => setPreviewHtml(''));
  }, [fields, emp, company, today]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      const res = await fetch(`/api/documents/offer-letter/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ...fields,
            companyName:   company?.legal_name || company?.name || '',
            propertyName:  emp?.properties?.name ?? '',
            employeeFirst: emp?.first_name ?? '',
            employeeLast:  emp?.last_name ?? '',
            positionTitle: emp?.positions?.title ?? '',
            payRate:       fields.customPayRate || String(emp?.pay_rate ?? ''),
            payType:       fields.customPayType || emp?.positions?.pay_type || 'hourly',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error ?? 'Failed to save offer letter.');
        return;
      }
      setToast({ message: 'Offer letter saved successfully.', type: 'success' });
    } catch {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const s = {
    page:   { display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: '100vh', background: '#faf8f4' },
    sidebar:{ background: '#fff', borderRight: '1px solid #e9e4da', padding: 24, overflowY: 'auto' as const },
    back:   { color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' },
    h2:     { fontSize: 17, fontWeight: 800, color: '#1c1b22', marginBottom: 4 },
    meta:   { fontSize: 12, color: '#6b6760', marginBottom: 20 },
    section:{ marginBottom: 24 },
    sh:     { fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 },
    field:  { marginBottom: 14 },
    row:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
    btnRow: { display: 'flex', gap: 10, marginTop: 16 },
    btnSav: { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, flex: 1 },
    btnPrt: { background: '#1c1b22', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, flex: 1 },
    preview:{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column' as const },
    pHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pBox:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, flex: 1, overflow: 'hidden' },
    iframe: { width: '100%', height: 'calc(100vh - 140px)', border: 'none', borderRadius: 10 },
    err:    { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
  } as const;

  if (loading) return <div style={{ padding: 40, color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ padding: 40, color: '#c0392b' }}>Failed to load — please refresh and try again.</div>;
  if (!emp)    return <div style={{ padding: 40, color: '#c0392b' }}>Employee not found.</div>;

  return (
    <div style={s.page}>
      {/* Left sidebar: form fields */}
      <div style={s.sidebar}>
        <Link href={`/employees/${id}`} style={s.back}>← {emp.first_name} {emp.last_name}</Link>
        <h2 style={s.h2}>Offer Letter</h2>
        <p style={s.meta}>{emp.first_name} {emp.last_name} · {emp.positions?.title ?? '—'} · {emp.properties?.name ?? '—'}</p>

        {saveError && <div style={s.err} className="animate-shake">{saveError}</div>}

        <div style={s.section}>
          <div style={s.sh}>Dates</div>
          <div style={s.row}>
            <div><label>Offer date</label><input type="date" value={fields.offerDate.includes('/') ? '' : fields.offerDate} onChange={e => setFields(p => ({ ...p, offerDate: e.target.value }))} /></div>
            <div><label>Start date</label><input type="date" value={fields.startDate} onChange={e => setFields(p => ({ ...p, startDate: e.target.value }))} /></div>
          </div>
          <div style={s.field}><label>Accept by <span style={{ color: '#a8a39a', fontWeight: 400 }}>(optional)</span></label><input type="date" value={fields.acceptBy} onChange={e => setFields(p => ({ ...p, acceptBy: e.target.value }))} /></div>
        </div>

        <div style={s.section}>
          <div style={s.sh}>Compensation</div>
          <div style={s.row}>
            <div>
              <label>Pay type</label>
              <select value={fields.customPayType || emp.positions?.pay_type || 'hourly'} onChange={e => setFields(p => ({ ...p, customPayType: e.target.value as 'hourly' | 'salary' }))}>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
            </div>
            <div>
              <label>Rate / salary</label>
              <input type="number" step="0.01" min="0" placeholder={String(emp.pay_rate)} value={fields.customPayRate} onChange={e => setFields(p => ({ ...p, customPayRate: e.target.value }))} />
            </div>
          </div>
          <div style={s.field}>
            <label>Employment type</label>
            <select value={fields.employmentType} onChange={e => setFields(p => ({ ...p, employmentType: e.target.value }))}>
              <option>Full-time</option><option>Part-time</option><option>Seasonal</option><option>Temporary</option>
            </select>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sh}>Signing authority</div>
          <div style={s.field}><label>Signer name</label><input placeholder="e.g. Kyle Metzger" value={fields.signerName} onChange={e => setFields(p => ({ ...p, signerName: e.target.value }))} /></div>
          <div style={s.field}><label>Signer title</label><input placeholder="General Manager" value={fields.signerTitle} onChange={e => setFields(p => ({ ...p, signerTitle: e.target.value }))} /></div>
        </div>

        <div style={s.section}>
          <div style={s.sh}>Additional notes <span style={{ color: '#a8a39a', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
          <textarea rows={3} placeholder="Custom paragraph added to the body of the letter…" value={fields.notes} onChange={e => setFields(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>

        <div style={s.btnRow}>
          <button style={s.btnSav} onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Save letter'}
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <a href={`/documents/offer-letter/${id}/print`} target="_blank" rel="noreferrer"
            style={{ display: 'block', textAlign: 'center', background: '#1c1b22', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
            🖨 Print / Save as PDF
          </a>
        </div>
        <div style={{ marginTop: 8 }}>
          <a href={`/api/employees/${id}/export`}
            style={{ display: 'block', textAlign: 'center', background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
            ⬇ Export full onboarding ZIP
          </a>
        </div>
      </div>

      {/* Right: live preview */}
      <div style={s.preview}>
        <div style={s.pHead}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1c1b22' }}>Live preview</div>
          <span style={{ fontSize: 12, color: '#a8a39a' }}>Updates as you type</span>
        </div>
        <div style={s.pBox}>
          {previewHtml
            ? <iframe srcDoc={previewHtml} style={s.iframe} title="Offer letter preview" />
            : <div style={{ padding: 32, color: '#a8a39a', textAlign: 'center' }}>Fill in the fields to see a preview…</div>
          }
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
