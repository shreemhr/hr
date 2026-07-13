'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Toast, { ToastState } from '@/components/Toast';

interface OffboardRecord {
  id: string; termination_type: string; last_day: string | null;
  rehire_eligible: boolean | null; notes: string | null; status: string; initiated_at: string;
}
interface OffboardTask {
  id: string; title: string; category: string; status: string; completed_at: string | null; notes: string | null;
}
interface Employee { first_name: string; last_name: string; properties: { name: string } | null; }

const TERM_TYPES = [
  { value: 'voluntary',     label: 'Voluntary Resignation' },
  { value: 'involuntary',   label: 'Involuntary Termination' },
  { value: 'layoff',        label: 'Layoff' },
  { value: 'retirement',    label: 'Retirement' },
  { value: 'contract_end',  label: 'Contract End' },
];

const CAT_ICONS: Record<string, string> = {
  equipment: '🔧', access: '🔑', payroll: '💵', documentation: '📄', general: '📋',
};

export default function OffboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [emp,     setEmp]     = useState<Employee | null>(null);
  const [record,  setRecord]  = useState<OffboardRecord | null>(null);
  const [tasks,   setTasks]   = useState<OffboardTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [termType,  setTermType]  = useState('voluntary');
  const [lastDay,   setLastDay]   = useState('');
  const [rehire,    setRehire]    = useState<string>('');
  const [obNotes,   setObNotes]   = useState('');
  const [notify,    setNotify]    = useState('');
  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState('');
  const [loadError, setLoadError] = useState(false);
  const [toast,     setToast]     = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      const [er, obr] = await Promise.all([
        fetch(`/api/employees/${id}`).then(r => r.json()),
        fetch(`/api/employees/${id}/offboard`).then(r => r.json()),
      ]);
      setEmp(er);
      setRecord(obr.record ?? null);
      setTasks(obr.tasks ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function startOffboarding() {
    setStarting(true); setError('');
    const res = await fetch(`/api/employees/${id}/offboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        termination_type: termType,
        last_day:         lastDay || null,
        rehire_eligible:  rehire === 'yes' ? true : rehire === 'no' ? false : null,
        notes:            obNotes || null,
        notify_email:     notify || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to start offboarding.'); setStarting(false); return; }
    await load();
    setStarting(false);
  }

  async function toggleTask(taskId: string, current: string) {
    const next = current === 'complete' ? 'pending' : 'complete';
    try {
      const res = await fetch(`/api/offboarding/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to update task.', type: 'error' });
        return;
      }
      await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    }
  }

  const s = {
    page:   { padding: 32, maxWidth: 780 },
    h1:     { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:    { color: '#6b6760', fontSize: 14, marginBottom: 28 },
    card:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 16 },
    sh:     { fontWeight: 700, fontSize: 15, color: '#1c1b22', marginBottom: 16 },
    label:  { display: 'block', fontSize: 13, fontWeight: 600, color: '#34313d', marginBottom: 6 },
    input:  { width: '100%', padding: '9px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const, background: '#fff' },
    btn:    { background: '#c0392b', color: '#fff', fontWeight: 700, padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 },
    err:    { background: '#fae9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
    row:    { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f4f2ee', cursor: 'pointer' },
    bar:    { height: 6, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', marginTop: 8 },
  } as const;

  if (loading) return <div style={{ padding: 32, color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ padding: 32, color: '#c0392b' }}>Failed to load — please refresh and try again.</div>;
  if (!emp)    return <div style={{ padding: 32, color: '#c0392b' }}>Employee not found.</div>;

  const prop = emp.properties as unknown as { name: string } | null;
  const done    = tasks.filter(t => t.status !== 'pending').length;
  const total   = tasks.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={s.page}>
      <Link href={`/employees/${id}`} style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>
        ← {emp.first_name} {emp.last_name}
      </Link>
      <h1 style={s.h1}>Offboarding — {emp.first_name} {emp.last_name}</h1>
      <p style={s.sub}>{prop?.name ?? ''}</p>

      {!record ? (
        /* Start form */
        <div style={s.card}>
          <div style={s.sh}>Start Offboarding</div>
          {error && <div style={s.err}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Termination Type</label>
              <select style={s.select} value={termType} onChange={e => setTermType(e.target.value)}>
                {TERM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Last Day</label>
              <input style={s.input} type="date" value={lastDay} onChange={e => setLastDay(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Eligible for Rehire</label>
              <select style={s.select} value={rehire} onChange={e => setRehire(e.target.value)}>
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Notify Email (optional)</label>
              <input style={s.input} type="email" value={notify} onChange={e => setNotify(e.target.value)} placeholder="manager@property.com" />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Notes</label>
            <textarea
              style={{ ...s.input, height: 80, resize: 'vertical' as const }}
              value={obNotes}
              onChange={e => setObNotes(e.target.value)}
              placeholder="Context, circumstances, or additional details…"
            />
          </div>
          <button style={s.btn} onClick={startOffboarding} disabled={starting}>
            {starting ? 'Starting…' : '⚠ Start Offboarding'}
          </button>
        </div>
      ) : (
        /* Checklist */
        <>
          <div style={{ ...s.card, background: record.status === 'complete' ? '#e8f3ec' : '#fff', borderColor: record.status === 'complete' ? '#bbf7d0' : '#e9e4da' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {record.status === 'complete' ? '✓ Offboarding Complete' : 'Offboarding In Progress'}
                </div>
                <div style={{ color: '#6b6760', fontSize: 13, marginTop: 4 }}>
                  {TERM_TYPES.find(t => t.value === record.termination_type)?.label ?? record.termination_type}
                  {record.last_day && ` · Last day: ${new Date(record.last_day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1c1b22' }}>{pct}%</div>
                <div style={{ fontSize: 12, color: '#6b6760' }}>{done}/{total} tasks</div>
              </div>
            </div>
            <div style={s.bar}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999, transition: 'width 0.3s' }} />
            </div>
          </div>

          <div style={s.card}>
            <div style={s.sh}>Offboarding Checklist</div>
            {tasks.map((task, i) => (
              <div
                key={task.id}
                style={{ ...s.row, borderBottom: i === tasks.length - 1 ? 'none' : undefined }}
                onClick={() => toggleTask(task.id, task.status)}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${task.status === 'complete' ? '#16794a' : '#ddd8cd'}`,
                  background: task.status === 'complete' ? '#16794a' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {task.status === 'complete' && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, color: task.status === 'complete' ? '#a8a39a' : '#1c1b22', textDecoration: task.status === 'complete' ? 'line-through' : 'none', flex: 1 }}>
                  {CAT_ICONS[task.category] ?? '•'} {task.title}
                </span>
                {task.completed_at && (
                  <span style={{ fontSize: 11, color: '#a8a39a', flexShrink: 0 }}>
                    {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
