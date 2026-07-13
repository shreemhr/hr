'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast, { ToastState } from '@/components/Toast';

interface DiscRecord {
  id: string; type: string; issued_date: string; description: string;
  action_taken: string | null; employee_acknowledged: boolean; employee_acknowledged_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Verbal Warning', written_warning: 'Written Warning',
  final_warning: 'Final Warning', pip: 'Performance Improvement Plan',
  suspension: 'Suspension', other: 'Other',
};

export default function PortalDisciplinaryPage() {
  const [records,  setRecords]  = useState<DiscRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetch('/api/portal/disciplinary')
      .then(async r => {
        if (!r.ok) { setLoadError(true); return; }
        setRecords(await r.json());
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  async function acknowledge(id: string) {
    setAckingId(id);
    try {
      const res = await fetch('/api/portal/disciplinary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: id, employee_response: responses[id] ?? '' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to save acknowledgement.', type: 'error' });
        return;
      }
      setResponses(prev => { const next = { ...prev }; delete next[id]; return next; });
      const updated = await fetch('/api/portal/disciplinary').then(r => r.json());
      setRecords(updated);
      setToast({ message: 'Acknowledgement saved.', type: 'success' });
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setAckingId(null);
    }
  }

  const pending = records.filter(r => !r.employee_acknowledged);

  const s = {
    h1:   { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:  { color: '#6b6760', fontSize: 14, margin: '0 0 24px' },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 22, marginBottom: 14 },
    ta:   { width: '100%', padding: '8px 10px', border: '1px solid #ddd8cd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'vertical' as const, minHeight: 60 },
    btn:  { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 },
  } as const;

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ color: '#c0392b' }}>Failed to load — please refresh, or sign in again if your session expired.</div>;

  return (
    <div>
      <Link href="/portal/dashboard" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={s.h1}>Disciplinary Records</h1>
      <p style={s.sub}>Records issued by your HR team. Please acknowledge any pending items.</p>

      {pending.length > 0 && (
        <div style={{ background: '#fbf1de', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#8a5a13' }}>
          ⚠ You have {pending.length} record{pending.length !== 1 ? 's' : ''} pending your acknowledgement.
        </div>
      )}

      {records.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center' as const, color: '#a8a39a', padding: 48 }}>No disciplinary records on file.</div>
      )}

      {records.map(r => (
        <div key={r.id} style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{TYPE_LABELS[r.type] ?? r.type}</div>
              <div style={{ color: '#a8a39a', fontSize: 12, marginTop: 2 }}>
                Issued {new Date(r.issued_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <span style={{ background: r.employee_acknowledged ? '#e8f3ec' : '#fae9e7', color: r.employee_acknowledged ? '#16794a' : '#c0392b', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
              {r.employee_acknowledged ? '✓ Acknowledged' : 'Needs acknowledgement'}
            </span>
          </div>

          <div style={{ fontSize: 14, color: '#1c1b22', marginBottom: 10, lineHeight: 1.6 }}>{r.description}</div>

          {r.action_taken && (
            <div style={{ background: '#f4f2ee', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#6b6760', marginBottom: 12 }}>
              <strong>Action required:</strong> {r.action_taken}
            </div>
          )}

          {!r.employee_acknowledged && (
            <div style={{ borderTop: '1px solid #f4f2ee', paddingTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#34313d', marginBottom: 6 }}>
                Your response (optional)
              </label>
              <textarea
                style={s.ta}
                placeholder="Add any comments or context…"
                value={responses[r.id] ?? ''}
                onChange={e => setResponses(prev => ({ ...prev, [r.id]: e.target.value }))}
              />
              <button style={{ ...s.btn, marginTop: 10 }} onClick={() => acknowledge(r.id)} disabled={ackingId === r.id}>
                {ackingId === r.id ? 'Saving…' : 'I have read and acknowledge this record'}
              </button>
            </div>
          )}

          {r.employee_acknowledged && r.employee_acknowledged_at && (
            <div style={{ fontSize: 12, color: '#16794a', marginTop: 8 }}>
              Acknowledged {new Date(r.employee_acknowledged_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
      ))}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
