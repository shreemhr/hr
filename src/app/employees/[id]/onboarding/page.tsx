'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  form_id: string;
  form_name: string;
  description?: string;
  form_link?: string;
  status: 'pending' | 'collected' | 'na';
  collected_at?: string;
  notes?: string;
}
interface EmpInfo { first_name: string; last_name: string; property_name: string; property_state: string; }

export default function EmployeeOnboardingPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [emp, setEmp]       = useState<EmpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    const [er, or] = await Promise.all([
      fetch(`/api/employees/${id}`).then(r => r.json()),
      fetch(`/api/onboarding?employeeId=${id}`).then(r => r.json()),
    ]);
    setEmp(er.employee ?? null);
    setTasks(or.tasks ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(taskId: string, status: 'pending' | 'collected' | 'na') {
    setUpdating(taskId);
    await fetch(`/api/onboarding/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await load();
    setUpdating(null);
  }

  async function saveNote(taskId: string, note: string) {
    await fetch(`/api/onboarding/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: note }) });
    setNoteEdit(null);
    load();
  }

  const collected = tasks.filter(t => t.status === 'collected').length;
  const na        = tasks.filter(t => t.status === 'na').length;
  const total     = tasks.length;
  const done      = collected + na;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete  = pct === 100;

  const s = {
    page:    { padding: 32, maxWidth: 760 },
    back:    { color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' },
    head:    { marginBottom: 24 },
    h1:      { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: 0 },
    meta:    { color: '#6b6760', marginTop: 4, fontSize: 14 },
    progCard:{ background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: '20px 24px', marginBottom: 20 },
    progBar: { height: 10, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', margin: '10px 0 6px' },
    task:    (status: string) => ({
      background: '#fff',
      border: `1px solid ${status === 'collected' ? '#bbf7d0' : status === 'na' ? '#f4f2ee' : '#e9e4da'}`,
      borderRadius: 10,
      padding: '18px 20px',
      marginBottom: 10,
      opacity: status === 'na' ? 0.7 : 1,
    }),
    taskTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    taskName:{ fontWeight: 600, fontSize: 15, color: '#1c1b22', marginBottom: 2 },
    taskDesc:{ fontSize: 12, color: '#6b6760' },
    btnRow:  { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' as const },
    btnCol:  (active: boolean, color: string) => ({
      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
      background: active ? color : '#f4f2ee', color: active ? '#fff' : '#6b6760',
    }),
    noteBtn: { fontSize: 12, color: '#6b6760', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', textDecoration: 'underline' as const },
    collDate:{ fontSize: 11, color: '#16794a', marginTop: 4 },
    actRow:  { display: 'flex', gap: 10, marginTop: 16 },
    btnPri:  { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', fontSize: 14 },
    btnSec:  { background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', fontSize: 14 },
  } as const;

  if (loading) return <div style={{ padding: 40, color: '#6b6760' }}>Loading…</div>;
  if (!emp)    return <div style={{ padding: 40, color: '#c0392b' }}>Employee not found.</div>;

  return (
    <div style={s.page}>
      <Link href={`/employees/${id}`} style={s.back}>← {emp.first_name} {emp.last_name}</Link>

      <div style={s.head}>
        <h1 style={s.h1}>Onboarding checklist</h1>
        <p style={s.meta}>{emp.first_name} {emp.last_name} · {emp.property_name} ({emp.property_state})</p>
      </div>

      {/* Progress card */}
      <div style={s.progCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {complete ? '✅ Onboarding complete!' : `${done} of ${total} forms complete`}
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: complete ? '#16794a' : '#4f46e5' }}>{pct}%</span>
        </div>
        <div style={s.progBar}>
          <div style={{ height: '100%', width: `${pct}%`, background: complete ? '#16794a' : '#4f46e5', borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6b6760' }}>
          {collected} collected · {na} not applicable · {tasks.filter(t => t.status === 'pending').length} pending
        </div>
        <div style={s.actRow}>
          <Link href={`/documents/offer-letter/${id}`} style={s.btnPri}>📄 Offer letter</Link>
          <a href={`/api/employees/${id}/export`} style={s.btnSec}>⬇ Export ZIP</a>
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 32, textAlign: 'center', color: '#a8a39a' }}>
          No forms loaded. Go back and start onboarding again.
        </div>
      ) : (
        tasks.map(task => (
          <div key={task.id} style={s.task(task.status)}>
            <div style={s.taskTop}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {task.status === 'collected' ? '✅' : task.status === 'na' ? '➖' : '⬜'}
                  </span>
                  <span style={s.taskName}>{task.form_name}</span>
                </div>
                {task.notes && (
                  <div style={{ fontSize: 12, color: '#6b6760', marginTop: 4, marginLeft: 26 }}>Note: {task.notes}</div>
                )}
                {task.collected_at && task.status === 'collected' && (
                  <div style={{ ...s.collDate, marginLeft: 26 }}>
                    Collected {new Date(task.collected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
              {task.form_link && (
                <a href={task.form_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#4f46e5', textDecoration: 'none', flexShrink: 0 }}>
                  ↗ Official form
                </a>
              )}
            </div>

            <div style={s.btnRow}>
              <button
                style={s.btnCol(task.status === 'collected', '#16794a')}
                disabled={updating === task.id}
                onClick={() => setStatus(task.id, task.status === 'collected' ? 'pending' : 'collected')}
              >
                {task.status === 'collected' ? '✓ Collected' : 'Mark collected'}
              </button>
              <button
                style={s.btnCol(task.status === 'na', '#6b6760')}
                disabled={updating === task.id}
                onClick={() => setStatus(task.id, task.status === 'na' ? 'pending' : 'na')}
              >
                N/A
              </button>
              <button
                style={s.noteBtn}
                onClick={() => setNoteEdit(noteEdit?.id === task.id ? null : { id: task.id, value: task.notes ?? '' })}
              >
                {task.notes ? 'Edit note' : '+ Add note'}
              </button>
            </div>

            {noteEdit?.id === task.id && (
              <div style={{ marginTop: 10, marginLeft: 0 }}>
                <textarea
                  rows={2}
                  placeholder="Add a note about this form…"
                  value={noteEdit.value}
                  onChange={e => setNoteEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                  style={{ fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid #a8a39a', width: '100%', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => saveNote(task.id, noteEdit.value)} style={{ background: '#4f46e5', color: '#fff', fontWeight: 600, padding: '5px 14px', borderRadius: 6, fontSize: 12 }}>Save</button>
                  <button onClick={() => setNoteEdit(null)} style={{ background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '5px 14px', borderRadius: 6, fontSize: 12 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
