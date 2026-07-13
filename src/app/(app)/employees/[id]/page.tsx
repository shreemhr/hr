'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Toast, { ToastState } from '@/components/Toast';

// ── Types ──────────────────────────────────────────────────
interface Employee {
  id: string; first_name: string; last_name: string; email: string; phone: string;
  hire_date: string; pay_rate: number; employment_type: string; status: string; onboarding_status: string;
  properties: { name: string; state: string } | null;
  positions:  { title: string; pay_type: string } | null;
}
interface Task         { status: string; }
interface ChecklistAsgn {
  assignment_id: string; template: { id: string; name: string; category: string } | null;
  items: { completion_id: string; title: string; status: string; completed_at: string | null }[];
  summary: { done: number; total: number; pct: number };
}
interface PortalInvite { token: string; created_at: string; last_login_at: string | null; }
interface DiscRecord {
  id: string; type: string; issued_date: string; incident_date: string | null;
  description: string; action_taken: string | null; follow_up_date: string | null;
  employee_acknowledged: boolean; users: { name: string } | null;
}
interface Review {
  id: string; review_period: string | null; review_date: string; rating: string | null;
  overall_comments: string | null; goals_next_period: string | null; status: string; users: { name: string } | null;
}
interface Note {
  id: string; type: string; content: string; created_at: string; author_id: string;
  users: { name: string } | null;
}

// ── Constants ──────────────────────────────────────────────
const DISC_TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Verbal Warning', written_warning: 'Written Warning',
  final_warning: 'Final Warning', pip: 'PIP', suspension: 'Suspension', other: 'Other',
};
const DISC_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  verbal_warning:  { bg: '#fbf1de', color: '#c2780c' },
  written_warning: { bg: '#fae9e7', color: '#c0392b' },
  final_warning:   { bg: '#fae9e7', color: '#7d3229' },
  pip:             { bg: '#eff6ff', color: '#4f46e5' },
  suspension:      { bg: '#fae9e7', color: '#c0392b' },
  other:           { bg: '#f4f2ee', color: '#6b6760' },
};
const RATING_LABELS: Record<string, string> = {
  unsatisfactory: 'Unsatisfactory', needs_improvement: 'Needs Improvement',
  meets_expectations: 'Meets Expectations', exceeds_expectations: 'Exceeds Expectations', outstanding: 'Outstanding',
};
const RATING_COLORS: Record<string, { bg: string; color: string }> = {
  unsatisfactory:       { bg: '#fae9e7', color: '#c0392b' },
  needs_improvement:    { bg: '#fbf1de', color: '#c2780c' },
  meets_expectations:   { bg: '#f4f2ee', color: '#6b6760' },
  exceeds_expectations: { bg: '#e8f3ec', color: '#16794a' },
  outstanding:          { bg: '#eef2ff', color: '#4f46e5' },
};
const NOTE_TYPE_ICONS: Record<string, string> = {
  general: '📝', meeting: '🤝', performance: '📊', concern: '⚠️', commendation: '⭐',
};
const CHECKLIST_ICONS: Record<string, string> = {
  general: '📋', equipment: '🔧', orientation: '🗺️', training: '📚', uniform: '👔', keys: '🗝️',
};

type Tab = 'overview' | 'onboarding' | 'disciplinary' | 'reviews' | 'notes';

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [emp,        setEmp]        = useState<Employee | null>(null);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<ChecklistAsgn[]>([]);
  const [invite,     setInvite]     = useState<PortalInvite | null>(null);
  const [newInvite,  setNewInvite]  = useState<{ token: string; pin: string } | null>(null);
  const [templates,  setTemplates]  = useState<{ id: string; name: string; category: string }[]>([]);
  const [discRecs,   setDiscRecs]   = useState<DiscRecord[]>([]);
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [notes,      setNotes]      = useState<Note[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState<ToastState | null>(null);

  // UI state
  const [assignTplId, setAssignTplId] = useState('');
  const [assigning,   setAssigning]   = useState(false);
  const [genInvite,   setGenInvite]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [starting,    setStarting]    = useState(false);

  // Disciplinary form
  const [dType,     setDType]     = useState('written_warning');
  const [dDate,     setDDate]     = useState('');
  const [dIncident, setDIncident] = useState('');
  const [dDesc,     setDDesc]     = useState('');
  const [dAction,   setDAction]   = useState('');
  const [dNotify,   setDNotify]   = useState('');
  const [dSaving,   setDSaving]   = useState(false);
  const [showDiscForm, setShowDiscForm] = useState(false);

  // Review form
  const [rPeriod,   setRPeriod]   = useState('');
  const [rDate,     setRDate]     = useState('');
  const [rRating,   setRRating]   = useState('');
  const [rComments, setRComments] = useState('');
  const [rGoals,    setRGoals]    = useState('');
  const [rSaving,   setRSaving]   = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Notes form
  const [nType,    setNType]    = useState('general');
  const [nContent, setNContent] = useState('');
  const [nSaving,  setNSaving]  = useState(false);

  // Pay edit + exception flow
  const [editPay,    setEditPay]    = useState(false);
  const [payValue,   setPayValue]   = useState('');
  const [paySaving,  setPaySaving]  = useState(false);
  const [payMsg,     setPayMsg]     = useState<{ kind: 'ok' | 'err' | 'flag'; text: string } | null>(null);
  const [bandBlock,  setBandBlock]  = useState<null | { min: number | null; max: number | null; rate: number; payType: string; positionTitle: string | null }>(null);
  const [excReason,  setExcReason]  = useState('');
  const [excSaving,  setExcSaving]  = useState(false);
  const [excSent,    setExcSent]    = useState(false);

  // Recognition
  const [showReco,   setShowReco]   = useState(false);
  const [recoCat,    setRecoCat]    = useState('kudos');
  const [recoNote,   setRecoNote]   = useState('');
  const [recoSaving, setRecoSaving] = useState(false);
  const [recoDone,   setRecoDone]   = useState(false);

  async function savePay() {
    if (payValue === '') return;
    setPaySaving(true); setPayMsg(null); setBandBlock(null);
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pay_rate: Number(payValue) }),
    });
    setPaySaving(false);
    if (res.ok) {
      const d = await res.json();
      if (d.pay_flagged) setPayMsg({ kind: 'flag', text: 'Saved — this is outside the band, so corporate has been notified.' });
      else setPayMsg({ kind: 'ok', text: 'Pay updated.' });
      setEditPay(false);
      await load();
      return;
    }
    const d = await res.json().catch(() => ({}));
    if (res.status === 422 && d.code === 'PAY_BAND_EXCEEDED' && d.band) {
      setBandBlock({ min: d.band.min, max: d.band.max, rate: d.band.rate, payType: d.band.payType, positionTitle: d.band.positionTitle });
    } else {
      setPayMsg({ kind: 'err', text: d.error ?? 'Could not save pay.' });
    }
  }

  async function requestException() {
    if (!bandBlock) return;
    setExcSaving(true);
    const res = await fetch('/api/compensation/exceptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: id, requested_rate: bandBlock.rate, reason: excReason }),
    });
    setExcSaving(false);
    if (res.ok) { setExcSent(true); }
    else { const d = await res.json().catch(() => ({})); setPayMsg({ kind: 'err', text: d.error ?? 'Could not submit request.' }); }
  }

  async function giveRecognition() {
    setRecoSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}/recognitions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: recoCat, note: recoNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to save recognition.', type: 'error' });
        return;
      }
      setRecoDone(true); setRecoNote(''); setTimeout(() => { setShowReco(false); setRecoDone(false); }, 1400);
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setRecoSaving(false);
    }
  }

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const empRes = await fetch(`/api/employees/${id}`);
      if (!empRes.ok) { setLoadError(true); setLoading(false); return; }
      const [er, or, cr, ir, tr, dr, rr, nr] = await Promise.all([
        empRes.json(),
        fetch(`/api/onboarding?employee_id=${id}`).then(r => r.json()).catch(() => null),
        fetch(`/api/employees/${id}/checklists`).then(r => r.json()).catch(() => []),
        fetch(`/api/employees/${id}/portal-invite`).then(r => r.json()).catch(() => null),
        fetch('/api/checklists').then(r => r.json()).catch(() => []),
        fetch(`/api/employees/${id}/disciplinary`).then(r => r.json()).catch(() => []),
        fetch(`/api/employees/${id}/reviews`).then(r => r.json()).catch(() => []),
        fetch(`/api/employees/${id}/notes`).then(r => r.json()).catch(() => []),
      ]);
      setEmp(er);
      if (Array.isArray(or)) setTasks(or[0]?.tasks ?? []);
      setChecklists(Array.isArray(cr) ? cr : []);
      setInvite(ir?.invite ?? null);
      setTemplates(Array.isArray(tr) ? tr.filter((t: { active: boolean }) => t.active) : []);
      setDiscRecs(Array.isArray(dr) ? dr : []);
      setReviews(Array.isArray(rr) ? rr : []);
      setNotes(Array.isArray(nr) ? nr : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──
  async function startOnboarding() {
    setStarting(true);
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: id }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to start onboarding.', type: 'error' });
        return;
      }
      await load(); setTab('onboarding');
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setStarting(false);
    }
  }

  async function toggleChecklistItem(completionId: string, cur: string) {
    try {
      const res = await fetch(`/api/employees/${id}/checklists`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completionId, status: cur === 'complete' ? 'pending' : 'complete' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to update checklist item.', type: 'error' });
        return;
      }
      await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    }
  }

  async function assignChecklist() {
    if (!assignTplId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/checklists/${assignTplId}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to assign checklist.', type: 'error' });
        return;
      }
      setAssignTplId(''); await load();
      setToast({ message: 'Checklist assigned.', type: 'success' });
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setAssigning(false);
    }
  }

  async function generateInvite() {
    setGenInvite(true);
    try {
      const res = await fetch(`/api/employees/${id}/portal-invite`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ message: data.error ?? 'Failed to generate invite.', type: 'error' });
        return;
      }
      setNewInvite(data); await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setGenInvite(false);
    }
  }

  async function saveDisc() {
    if (!dDate || !dDesc) return;
    setDSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}/disciplinary`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: dType, issued_date: dDate, incident_date: dIncident || null, description: dDesc, action_taken: dAction || null, notify_email: dNotify || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to save disciplinary record.', type: 'error' });
        return;
      }
      setDDesc(''); setDAction(''); setDIncident(''); setDNotify(''); setShowDiscForm(false);
      await load();
      setToast({ message: 'Disciplinary record saved.', type: 'success' });
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setDSaving(false);
    }
  }

  async function saveReview() {
    if (!rDate) return;
    setRSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_period: rPeriod || null, review_date: rDate, rating: rRating || null, overall_comments: rComments || null, goals_next_period: rGoals || null, status: 'completed' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to save review.', type: 'error' });
        return;
      }
      setRPeriod(''); setRDate(''); setRRating(''); setRComments(''); setRGoals(''); setShowReviewForm(false);
      await load();
      setToast({ message: 'Review saved.', type: 'success' });
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setRSaving(false);
    }
  }

  async function addNote() {
    if (!nContent.trim()) return;
    setNSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: nType, content: nContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to add note.', type: 'error' });
        return;
      }
      setNContent(''); await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    } finally {
      setNSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    try {
      const res = await fetch(`/api/employees/${id}/notes?note_id=${noteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to delete note.', type: 'error' });
        return;
      }
      await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    }
  }

  async function markDiscAcked(recordId: string) {
    try {
      const res = await fetch(`/api/employees/${id}/disciplinary/${recordId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_acknowledged: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.error ?? 'Failed to update record.', type: 'error' });
        return;
      }
      await load();
    } catch {
      setToast({ message: 'Network error — please try again.', type: 'error' });
    }
  }

  // ── Styles ──
  const s = {
    page:    { padding: 32, maxWidth: 900 },
    h1:      { fontSize: 24, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub:     { color: '#6b6760', marginTop: 4, fontSize: 14 },
    tabs:    { display: 'flex', gap: 4, borderBottom: '1px solid #e9e4da', marginBottom: 24, marginTop: 20 },
    tab:     (active: boolean) => ({
      padding: '9px 16px', fontSize: 14, fontWeight: active ? 700 : 400,
      color: active ? '#4f46e5' : '#6b6760', borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
      background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s',
    }),
    card:    { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 22, marginBottom: 14 },
    sh:      { fontWeight: 700, fontSize: 14, color: '#1c1b22', marginBottom: 14 },
    dl:      { display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 0', fontSize: 14 },
    dt:      { color: '#6b6760', fontWeight: 500 },
    dd:      { color: '#1c1b22', fontWeight: 500 },
    badge:   (ok: boolean) => ({ display: 'inline-block', background: ok ? '#e8f3ec' : '#fbf1de', color: ok ? '#16794a' : '#c2780c', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }),
    bar:     { height: 6, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', margin: '8px 0 4px' },
    btnPri:  { background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 },
    btnSec:  { background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 },
    btnRed:  { background: '#c0392b', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 },
    btnGrn:  { background: '#16794a', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 7, textDecoration: 'none', display: 'inline-block', fontSize: 13 },
    label:   { display: 'block', fontSize: 12, fontWeight: 600, color: '#34313d', marginBottom: 5 },
    input:   { width: '100%', padding: '8px 10px', border: '1px solid #ddd8cd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' },
    select:  { width: '100%', padding: '8px 10px', border: '1px solid #ddd8cd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' as const, background: '#fff' },
    textarea:{ width: '100%', padding: '8px 10px', border: '1px solid #ddd8cd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'vertical' as const, minHeight: 80 },
  } as const;

  if (loading) return <div style={{ padding: 40, color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ padding: 40, color: '#c0392b' }}>Failed to load — please refresh and try again.</div>;
  if (!emp)    return <div style={{ padding: 40, color: '#c0392b' }}>Employee not found.</div>;

  const prop = emp.properties;
  const pos  = emp.positions;
  const hasTasks = tasks.length > 0;
  const collected = tasks.filter(t => t.status === 'collected' || t.status === 'na').length;
  const obPct = hasTasks ? Math.round((collected / tasks.length) * 100) : 0;
  const payFmt = emp.pay_rate
    ? (pos?.pay_type === 'hourly' ? `$${Number(emp.pay_rate).toFixed(2)}/hr` : `$${Number(emp.pay_rate).toLocaleString()}/yr`)
    : '—';
  const assignedTplIds = new Set(checklists.map(c => c.template?.id));
  const unassignedTpls = templates.filter(t => !assignedTplIds.has(t.id));
  const pendingDisc = discRecs.filter(r => !r.employee_acknowledged).length;

  return (
    <div style={s.page}>
      <Link href="/employees" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← All employees</Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={s.h1}>{emp.first_name} {emp.last_name}</h1>
          <p style={s.sub}>{pos?.title ?? '—'} · {prop?.name ?? '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {emp.status === 'active' && (
            <button onClick={() => { setShowReco(true); setRecoDone(false); }} style={{ background: '#f6efe1', color: '#b5832e', fontWeight: 600, fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #ecdcbf' }}>⭐ Recognize</button>
          )}
          <Link href={`/documents/offer-letter/${id}`} style={s.btnGrn}>📄 Offer Letter</Link>
          {emp.status === 'active' && (
            <Link href={`/employees/${id}/offboard`} style={{ ...s.btnRed, textDecoration: 'none' }}>⚠ Offboard</Link>
          )}
          {emp.status === 'terminated' && (
            <Link href={`/employees/${id}/offboard`} style={{ ...s.btnSec, textDecoration: 'none' }}>Offboarding →</Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {([
          ['overview',     'Overview'],
          ['onboarding',   `Onboarding${hasTasks ? ` (${obPct}%)` : ''}`],
          ['disciplinary', `Disciplinary${discRecs.length ? ` (${discRecs.length})` : ''}`],
          ['reviews',      `Reviews${reviews.length ? ` (${reviews.length})` : ''}`],
          ['notes',        `Notes${notes.length ? ` (${notes.length})` : ''}`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <>
          <div style={s.card}>
            <div style={s.sh}>Personal Information</div>
            <div style={s.dl}>
              <span style={s.dt}>Email</span><span style={s.dd}>{emp.email || '—'}</span>
              <span style={s.dt}>Phone</span><span style={s.dd}>{emp.phone || '—'}</span>
              <span style={s.dt}>Hire Date</span>
              <span style={s.dd}>{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span>
              <span style={s.dt}>Status</span>
              <span style={s.dd}>
                <span style={{ background: emp.status === 'active' ? '#e8f3ec' : '#fae9e7', color: emp.status === 'active' ? '#16794a' : '#c0392b', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {emp.status}
                </span>
              </span>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sh}>Employment Details</div>
            <div style={s.dl}>
              <span style={s.dt}>Property</span><span style={s.dd}>{prop?.name ?? '—'}</span>
              <span style={s.dt}>State</span><span style={s.dd}>{prop?.state ?? '—'}</span>
              <span style={s.dt}>Position</span><span style={s.dd}>{pos?.title ?? '—'}</span>
              <span style={s.dt}>Employment</span><span style={s.dd}>{emp.employment_type?.replace('_', '-') ?? '—'}</span>
              <span style={s.dt}>Pay</span>
              <span style={s.dd}>
                {!editPay ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    {payFmt}
                    {emp.status === 'active' && (
                      <button onClick={() => { setEditPay(true); setPayValue(emp.pay_rate ? String(emp.pay_rate) : ''); setPayMsg(null); }}
                        style={{ background: '#f4f2ee', color: '#6b6760', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: '1px solid #e9e4da' }}>Edit</button>
                    )}
                    {payMsg && <span style={{ fontSize: 12, color: payMsg.kind === 'err' ? '#c0392b' : payMsg.kind === 'flag' ? '#c2780c' : '#16794a' }}>{payMsg.text}</span>}
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 8, top: 7, color: '#a8a39a', fontSize: 13 }}>$</span>
                      <input type="number" step="0.25" value={payValue} onChange={e => setPayValue(e.target.value)}
                        style={{ width: 110, paddingLeft: 18, padding: '6px 8px 6px 18px', border: '1.5px solid #ddd8cd', borderRadius: 7, fontSize: 14 }} autoFocus />
                    </span>
                    <span style={{ fontSize: 12, color: '#a8a39a' }}>{pos?.pay_type === 'salary' ? '/yr' : '/hr'}</span>
                    <button onClick={savePay} disabled={paySaving} style={{ background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 13px', borderRadius: 7 }}>{paySaving ? '…' : 'Save'}</button>
                    <button onClick={() => { setEditPay(false); setBandBlock(null); }} style={{ background: '#f4f2ee', color: '#6b6760', fontSize: 13, fontWeight: 600, padding: '6px 11px', borderRadius: 7 }}>Cancel</button>
                  </span>
                )}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── Tab: Onboarding ── */}
      {tab === 'onboarding' && (
        <>
          {/* Forms */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ ...s.sh, margin: 0 }}>Onboarding Forms</div>
              {!hasTasks
                ? <button onClick={startOnboarding} style={s.btnPri} disabled={starting}>{starting ? '…' : 'Start Onboarding'}</button>
                : <Link href={`/employees/${id}/onboarding`} style={{ ...s.btnPri, textDecoration: 'none' }}>View Checklist →</Link>
              }
            </div>
            {hasTasks ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{collected} of {tasks.length} collected</span>
                  <span style={s.badge(obPct === 100)}>{obPct === 100 ? 'Complete' : `${tasks.length - collected} pending`}</span>
                </div>
                <div style={s.bar}>
                  <div style={{ height: '100%', width: `${obPct}%`, background: obPct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999 }} />
                </div>
                <a href={`/api/employees/${id}/export`} style={{ ...s.btnSec, textDecoration: 'none', display: 'inline-block', marginTop: 10, fontSize: 12 }}>⬇ Export ZIP</a>
              </>
            ) : (
              <div style={{ color: '#a8a39a', fontSize: 13 }}>No onboarding tasks yet.</div>
            )}
          </div>

          {/* Custom checklists */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={s.sh}>Custom Checklists</div>
              {unassignedTpls.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={assignTplId} onChange={e => setAssignTplId(e.target.value)} style={{ ...s.select, width: 180 }}>
                    <option value="">Assign template…</option>
                    {unassignedTpls.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button onClick={assignChecklist} disabled={!assignTplId || assigning} style={s.btnPri}>{assigning ? '…' : 'Assign'}</button>
                </div>
              )}
            </div>
            {checklists.length === 0 && <div style={{ color: '#a8a39a', fontSize: 13 }}>No checklists assigned.</div>}
            {checklists.map(cl => {
              const { done, total, pct } = cl.summary;
              return (
                <div key={cl.assignment_id} style={{ border: '1px solid #f4f2ee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{CHECKLIST_ICONS[cl.template?.category ?? 'general']} {cl.template?.name}</span>
                    <span style={s.badge(pct === 100)}>{done}/{total}</span>
                  </div>
                  <div style={s.bar}><div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16794a' : '#4f46e5', borderRadius: 999 }} /></div>
                  <div style={{ marginTop: 8 }}>
                    {cl.items.map((item, i) => (
                      <div key={item.completion_id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === cl.items.length - 1 ? 'none' : '1px solid #f4f2ee', cursor: 'pointer' }}
                        onClick={() => item.completion_id && toggleChecklistItem(item.completion_id, item.status)}>
                        <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${item.status === 'complete' ? '#16794a' : '#ddd8cd'}`, background: item.status === 'complete' ? '#16794a' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.status === 'complete' && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 13, color: item.status === 'complete' ? '#a8a39a' : '#1c1b22', textDecoration: item.status === 'complete' ? 'line-through' : 'none' }}>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Portal invite */}
          <div style={s.card}>
            <div style={s.sh}>Employee Portal Access</div>
            {invite && !newInvite && (
              <div style={{ background: '#f4f2ee', borderRadius: 7, padding: 12, marginBottom: 12, fontSize: 13, color: '#6b6760' }}>
                Active invite · Created {new Date(invite.created_at).toLocaleDateString('en-US')}
                {invite.last_login_at && ` · Last login ${new Date(invite.last_login_at).toLocaleDateString('en-US')}`}
              </div>
            )}
            {newInvite && (
              <div style={{ background: '#e8f3ec', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 8 }}>✓ Invite generated — share with employee</div>
                <div style={{ background: '#1c1b22', color: '#86efac', fontFamily: 'monospace', borderRadius: 5, padding: '7px 10px', fontSize: 12, wordBreak: 'break-all' as const, marginBottom: 8 }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/portal?t=${newInvite.token}` : `/portal?t=${newInvite.token}`}
                </div>
                <div style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>PIN (shown once):</div>
                <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, letterSpacing: 10, color: '#1c1b22' }}>{newInvite.pin}</div>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal?t=${newInvite.token}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ ...s.btnPri, marginTop: 10 }}>{copied ? '✓ Copied' : '📋 Copy Link'}</button>
              </div>
            )}
            <button onClick={generateInvite} disabled={genInvite} style={s.btnPri}>
              {genInvite ? '…' : invite ? '🔄 Regenerate Invite' : '🔗 Generate Portal Invite'}
            </button>
          </div>
        </>
      )}

      {/* ── Tab: Disciplinary ── */}
      {tab === 'disciplinary' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#6b6760' }}>{discRecs.length} record{discRecs.length !== 1 ? 's' : ''}{pendingDisc > 0 ? ` · ${pendingDisc} pending employee acknowledgement` : ''}</div>
            <button onClick={() => setShowDiscForm(!showDiscForm)} style={s.btnPri}>+ New Record</button>
          </div>

          {showDiscForm && (
            <div style={s.card}>
              <div style={s.sh}>New Disciplinary Record</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Type</label>
                  <select style={s.select} value={dType} onChange={e => setDType(e.target.value)}>
                    {Object.entries(DISC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Date Issued *</label>
                  <input style={s.input} type="date" value={dDate} onChange={e => setDDate(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Incident Date</label>
                  <input style={s.input} type="date" value={dIncident} onChange={e => setDIncident(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Notify Email</label>
                  <input style={s.input} type="email" value={dNotify} onChange={e => setDNotify(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Description / Incident Summary *</label>
                <textarea style={s.textarea} value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder="Describe the incident or reason for this record…" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Action Taken</label>
                <textarea style={{ ...s.textarea, minHeight: 60 }} value={dAction} onChange={e => setDAction(e.target.value)} placeholder="What corrective action was taken or required…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveDisc} disabled={dSaving || !dDate || !dDesc} style={s.btnPri}>{dSaving ? 'Saving…' : 'Save Record'}</button>
                <button onClick={() => setShowDiscForm(false)} style={s.btnSec}>Cancel</button>
              </div>
            </div>
          )}

          {discRecs.length === 0 && !showDiscForm && (
            <div style={{ ...s.card, textAlign: 'center' as const, color: '#a8a39a', padding: 40 }}>No disciplinary records for this employee.</div>
          )}

          {discRecs.map(r => {
            const tc = DISC_TYPE_COLORS[r.type] ?? { bg: '#f4f2ee', color: '#6b6760' };
            return (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ background: tc.bg, color: tc.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{DISC_TYPE_LABELS[r.type] ?? r.type}</span>
                    <span style={{ color: '#a8a39a', fontSize: 12, marginLeft: 10 }}>Issued {new Date(r.issued_date).toLocaleDateString('en-US')}</span>
                    {r.incident_date && <span style={{ color: '#a8a39a', fontSize: 12, marginLeft: 6 }}>· Incident {new Date(r.incident_date).toLocaleDateString('en-US')}</span>}
                  </div>
                  <span style={{ background: r.employee_acknowledged ? '#e8f3ec' : '#fbf1de', color: r.employee_acknowledged ? '#16794a' : '#c2780c', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {r.employee_acknowledged ? '✓ Acknowledged' : 'Pending'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#1c1b22', marginBottom: 6 }}>{r.description}</div>
                {r.action_taken && <div style={{ fontSize: 12, color: '#6b6760', background: '#f4f2ee', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>Action: {r.action_taken}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#a8a39a' }}>
                  <span>Issued by {(r.users as { name: string } | null)?.name ?? 'HR'}</span>
                  {!r.employee_acknowledged && (
                    <button onClick={() => markDiscAcked(r.id)} style={{ ...s.btnSec, fontSize: 11, padding: '4px 10px' }}>Mark Acknowledged</button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Tab: Reviews ── */}
      {tab === 'reviews' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#6b6760' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            <button onClick={() => setShowReviewForm(!showReviewForm)} style={s.btnPri}>+ New Review</button>
          </div>

          {showReviewForm && (
            <div style={s.card}>
              <div style={s.sh}>New Performance Review</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Review Period</label>
                  <input style={s.input} value={rPeriod} onChange={e => setRPeriod(e.target.value)} placeholder="e.g. Annual 2025, Q3 2026" />
                </div>
                <div>
                  <label style={s.label}>Review Date *</label>
                  <input style={s.input} type="date" value={rDate} onChange={e => setRDate(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>Overall Rating</label>
                  <select style={s.select} value={rRating} onChange={e => setRRating(e.target.value)}>
                    <option value="">Select rating…</option>
                    {Object.entries(RATING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Overall Comments</label>
                <textarea style={s.textarea} value={rComments} onChange={e => setRComments(e.target.value)} placeholder="Performance summary…" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Goals for Next Period</label>
                <textarea style={{ ...s.textarea, minHeight: 60 }} value={rGoals} onChange={e => setRGoals(e.target.value)} placeholder="Development goals and expectations…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveReview} disabled={rSaving || !rDate} style={s.btnPri}>{rSaving ? 'Saving…' : 'Save Review'}</button>
                <button onClick={() => setShowReviewForm(false)} style={s.btnSec}>Cancel</button>
              </div>
            </div>
          )}

          {reviews.length === 0 && !showReviewForm && (
            <div style={{ ...s.card, textAlign: 'center' as const, color: '#a8a39a', padding: 40 }}>No performance reviews yet.</div>
          )}

          {reviews.map(r => {
            const rc = r.rating ? (RATING_COLORS[r.rating] ?? { bg: '#f4f2ee', color: '#6b6760' }) : null;
            return (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.review_period ?? 'Performance Review'}</div>
                    <div style={{ color: '#a8a39a', fontSize: 12, marginTop: 2 }}>
                      {new Date(r.review_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {' · '}Reviewed by {(r.users as { name: string } | null)?.name ?? 'Manager'}
                    </div>
                  </div>
                  {rc && r.rating && (
                    <span style={{ background: rc.bg, color: rc.color, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {RATING_LABELS[r.rating]}
                    </span>
                  )}
                </div>
                {r.overall_comments && <div style={{ fontSize: 13, color: '#1c1b22', marginBottom: 8 }}>{r.overall_comments}</div>}
                {r.goals_next_period && (
                  <div style={{ background: '#f4f2ee', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#6b6760' }}>
                    <strong>Goals:</strong> {r.goals_next_period}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Tab: Notes ── */}
      {tab === 'notes' && (
        <>
          <div style={s.card}>
            <div style={s.sh}>Add Note</div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, marginBottom: 10 }}>
              <select style={s.select} value={nType} onChange={e => setNType(e.target.value)}>
                {Object.entries(NOTE_TYPE_ICONS).map(([v, icon]) => (
                  <option key={v} value={v}>{icon} {v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
              <textarea style={{ ...s.textarea, minHeight: 60, margin: 0 }} value={nContent} onChange={e => setNContent(e.target.value)} placeholder="Add a note about this employee…" />
            </div>
            <button onClick={addNote} disabled={nSaving || !nContent.trim()} style={s.btnPri}>{nSaving ? 'Saving…' : 'Add Note'}</button>
          </div>

          {notes.length === 0 && (
            <div style={{ ...s.card, textAlign: 'center' as const, color: '#a8a39a', padding: 40 }}>No notes yet.</div>
          )}

          {notes.map(n => (
            <div key={n.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 16 }}>{NOTE_TYPE_ICONS[n.type] ?? '📝'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', textTransform: 'capitalize' as const }}>{n.type}</span>
                  <span style={{ fontSize: 12, color: '#a8a39a' }}>·</span>
                  <span style={{ fontSize: 12, color: '#a8a39a' }}>{(n.users as { name: string } | null)?.name ?? 'HR'}</span>
                  <span style={{ fontSize: 12, color: '#a8a39a' }}>·</span>
                  <span style={{ fontSize: 12, color: '#a8a39a' }}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <button onClick={() => deleteNote(n.id)} style={{ background: 'transparent', border: 'none', color: '#a8a39a', cursor: 'pointer', fontSize: 16, padding: '0 4px' }} title="Delete">×</button>
              </div>
              <div style={{ fontSize: 14, color: '#1c1b22', marginTop: 8, lineHeight: 1.6 }}>{n.content}</div>
            </div>
          ))}
        </>
      )}

      {/* ── Modal: pay above band → request exception ── */}
      {bandBlock && (
        <div onClick={() => !excSent && setBandBlock(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,34,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 470, padding: 28 }}>
            {!excSent ? (
              <>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 21, fontWeight: 600 }}>Above the approved band</div>
                <p style={{ fontSize: 13.5, color: '#6b6760', marginTop: 6, lineHeight: 1.5 }}>
                  {fmtMoney(bandBlock.rate, bandBlock.payType)} is outside the approved band for {bandBlock.positionTitle ?? 'this role'}
                  {' '}({bandBlock.min != null ? fmtMoney(bandBlock.min, bandBlock.payType) : '—'} – {bandBlock.max != null ? fmtMoney(bandBlock.max, bandBlock.payType) : '—'}).
                  It can&rsquo;t be saved directly — send it to corporate for approval.
                </p>
                <div style={{ display: 'flex', gap: 22, marginTop: 16, padding: '14px 16px', background: '#fcf8f1', borderRadius: 11 }}>
                  <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a8a39a', fontWeight: 700 }}>Requested</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: '#c0392b', marginTop: 3 }}>{fmtMoney(bandBlock.rate, bandBlock.payType)}</div></div>
                  <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a8a39a', fontWeight: 700 }}>Band max</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, marginTop: 3 }}>{bandBlock.max != null ? fmtMoney(bandBlock.max, bandBlock.payType) : '—'}</div></div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for exception</label>
                  <textarea value={excReason} onChange={e => setExcReason(e.target.value)} placeholder="e.g. Counteroffer — competing offer at a higher rate, strong candidate, available now." style={{ width: '100%', border: '1.5px solid #ddd8cd', borderRadius: 10, padding: '11px 13px', fontSize: 14, minHeight: 80, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button onClick={() => setBandBlock(null)} style={{ background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '9px 16px', borderRadius: 9 }}>Cancel</button>
                  <button onClick={requestException} disabled={excSaving} style={{ background: '#b5832e', color: '#1c1b22', fontWeight: 600, padding: '9px 16px', borderRadius: 9 }}>{excSaving ? 'Sending…' : 'Send for approval'}</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 40 }}>✓</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginTop: 6 }}>Sent to corporate</div>
                <p style={{ fontSize: 14, color: '#6b6760', marginTop: 6 }}>You&rsquo;ll be notified once {bandBlock.positionTitle ? 'the' : 'the'} request is approved or denied. The pay rate hasn&rsquo;t changed yet.</p>
                <button onClick={() => { setBandBlock(null); setExcSent(false); setExcReason(''); }} style={{ background: '#1c1b22', color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: 9, marginTop: 14 }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: recognize ── */}
      {showReco && (
        <div onClick={() => !recoSaving && setShowReco(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,34,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28 }}>
            {!recoDone ? (
              <>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 21, fontWeight: 600 }}>Recognize {emp.first_name}</div>
                <p style={{ fontSize: 13.5, color: '#6b6760', marginTop: 6, lineHeight: 1.5 }}>A quick kudos boosts their star score and creates a record you can point to at raise time.</p>
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={recoCat} onChange={e => setRecoCat(e.target.value)} style={{ width: '100%', border: '1.5px solid #ddd8cd', borderRadius: 9, padding: '9px 12px', fontSize: 14 }}>
                    <option value="kudos">Kudos</option>
                    <option value="spot_award">Spot award</option>
                    <option value="guest_praise">Guest praise</option>
                    <option value="milestone">Milestone</option>
                    <option value="teamwork">Teamwork</option>
                  </select>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>What did they do?</label>
                  <textarea value={recoNote} onChange={e => setRecoNote(e.target.value)} placeholder="e.g. Covered three back-to-back shifts during the convention rush and got two guest shout-outs." style={{ width: '100%', border: '1.5px solid #ddd8cd', borderRadius: 10, padding: '11px 13px', fontSize: 14, minHeight: 80, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowReco(false)} style={{ background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '9px 16px', borderRadius: 9 }}>Cancel</button>
                  <button onClick={giveRecognition} disabled={recoSaving} style={{ background: '#b5832e', color: '#1c1b22', fontWeight: 600, padding: '9px 16px', borderRadius: 9 }}>{recoSaving ? 'Saving…' : 'Give kudos'}</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 40 }}>⭐</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginTop: 6 }}>Recognition recorded</div>
                <p style={{ fontSize: 14, color: '#6b6760', marginTop: 6 }}>It&rsquo;ll show up in this month&rsquo;s top performers.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function fmtMoney(rate: number, payType: string): string {
  return payType === 'salary' ? `$${rate.toLocaleString()}/yr` : `$${rate.toFixed(2)}/hr`;
}
