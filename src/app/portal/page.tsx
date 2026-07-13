'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRODUCT_NAME } from '@/lib/product';

function PortalLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('t') ?? '';

  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('Missing invite token. Use the link provided by your HR team.'); return; }
    if (pin.length !== 6) { setError('PIN must be exactly 6 digits.'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, pin }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Invalid PIN or expired link.'); setLoading(false); return; }
    router.push('/portal/dashboard');
  }

  const s = {
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#34313d', marginBottom: 6 } as const,
    pin:   { width: '100%', padding: '14px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 28, letterSpacing: 16, textAlign: 'center' as const, outline: 'none', boxSizing: 'border-box' as const, fontWeight: 700 },
    btn:   { width: '100%', background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '12px', borderRadius: 8, fontSize: 15, border: 'none', cursor: 'pointer', marginTop: 20 } as const,
    err:   { background: '#fae9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 16 } as const,
  };

  return (
    <form onSubmit={handleLogin}>
      {!token && (
        <div style={{ ...s.err, marginTop: 0, marginBottom: 16 }}>
          No invite link detected. Please use the link your HR team sent you.
        </div>
      )}
      <label style={s.label}>Your 6-digit PIN</label>
      <input
        style={s.pin}
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="••••••"
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        required
        autoFocus
        disabled={!token}
      />
      {error && <div style={s.err}>{error}</div>}
      <button type="submit" style={s.btn} disabled={loading || !token}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <div style={{ color: '#a8a39a', fontSize: 12, marginTop: 20, textAlign: 'center' as const }}>
        Your PIN was provided by your HR team along with this link.
      </div>
    </form>
  );
}

export default function PortalLoginPage() {
  const s = {
    wrap: { minHeight: '100vh', background: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' } as const,
    card: { background: '#fff', borderRadius: 14, border: '1px solid #e9e4da', padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' } as const,
  };
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#1c1b22', marginBottom: 4 }}>{PRODUCT_NAME}</div>
        <div style={{ color: '#6b6760', fontSize: 14, marginBottom: 32 }}>Employee Portal — Sign In</div>
        <Suspense fallback={<div style={{ color: '#6b6760' }}>Loading…</div>}>
          <PortalLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
