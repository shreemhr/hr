'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRODUCT_NAME, TRIAL_DAYS } from '@/lib/product';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', legalName: '', email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Signup failed'); setLoading(false); return; }
    router.push('/dashboard');
  }

  const s = {
    page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#faf8f4' },
    box:   { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 440 },
    logo:  { textAlign: 'center' as const, fontWeight: 800, fontSize: 22, color: '#1c1b22', marginBottom: 8 },
    sub:   { textAlign: 'center' as const, color: '#6b6760', fontSize: 13, marginBottom: 32 },
    field: { marginBottom: 16 },
    err:   { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    btn:   { width: '100%', padding: '11px 0', background: '#4f46e5', color: '#fff', fontWeight: 700, borderRadius: 8, fontSize: 15, marginTop: 8 },
    foot:  { textAlign: 'center' as const, marginTop: 20, fontSize: 13, color: '#6b6760' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.logo}>{PRODUCT_NAME}</div>
        <p style={s.sub}>Start your {TRIAL_DAYS}-day free trial — no credit card required.</p>
        {error && <div style={s.err}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.field}><label>Your name</label><input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div style={s.field}><label>Work email</label><input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div style={s.field}><label>Password</label><input type="password" required minLength={8} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
          <div style={s.field}><label>Company display name</label><input required placeholder="Shreem Hotels" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} /></div>
          <div style={s.field}><label>Legal entity name <span style={{ color: '#a8a39a', fontWeight: 400 }}>(optional — for documents)</span></label><input placeholder="Shreem Capital Management LLC" value={form.legalName} onChange={e => setForm(p => ({ ...p, legalName: e.target.value }))} /></div>
          <button type="submit" style={s.btn} disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        </form>
        <div style={s.foot}>Already have an account? <Link href="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
