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
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Login failed'); setShake(s => s + 1); setLoading(false); return; }
    router.push('/dashboard');
  }

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#faf8f4', position: 'relative' as const, overflow: 'hidden' },
    blob: { position: 'absolute' as const, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,131,46,0.10), transparent 70%)', top: -160, right: -120, pointerEvents: 'none' as const },
    box:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 14, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 20px 48px rgba(28,27,34,0.06)', position: 'relative' as const },
    logoWrap: { textAlign: 'center' as const, marginBottom: 32 },
    logo: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 26, color: '#1c1b22' },
    dot: { color: '#b5832e' },
    err:  { background: '#fae9e7', color: '#c0392b', border: '1px solid #f0c8c2', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    btn:  { width: '100%', padding: '11px 0', background: '#4f46e5', color: '#fff', fontWeight: 700, borderRadius: 8, fontSize: 15, marginTop: 8 },
    foot: { textAlign: 'center' as const, marginTop: 20, fontSize: 13, color: '#6b6760' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.blob} />
      <div style={s.box} className="animate-in-scale">
        <div style={s.logoWrap}>
          <span style={s.logo}>{PRODUCT_NAME}<span style={s.dot}>.</span></span>
        </div>
        {error && <div key={shake} style={s.err} className="animate-shake">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div style={{ marginBottom: 16 }}><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" style={s.btn} className="btn-primary" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={s.foot}>Don&apos;t have an account? <Link href="/signup">Start free trial</Link></div>
      </div>
    </div>
  );
}
