'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/lib/product';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Login failed'); setLoading(false); return; }
    router.push('/dashboard');
  }

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#faf8f4' },
    box:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 400 },
    logo: { textAlign: 'center' as const, fontWeight: 800, fontSize: 22, color: '#1c1b22', marginBottom: 32 },
    err:  { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    btn:  { width: '100%', padding: '11px 0', background: '#4f46e5', color: '#fff', fontWeight: 700, borderRadius: 8, fontSize: 15, marginTop: 8 },
    foot: { textAlign: 'center' as const, marginTop: 20, fontSize: 13, color: '#6b6760' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.logo}>{PRODUCT_NAME}</div>
        {error && <div style={s.err}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div style={{ marginBottom: 16 }}><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" style={s.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div style={s.foot}>Don&apos;t have an account? <Link href="/signup">Start free trial</Link></div>
      </div>
    </div>
  );
}
