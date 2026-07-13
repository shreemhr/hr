'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { PRODUCT_NAME } from '@/lib/product';

function SuccessContent() {
  const params    = useSearchParams();
  const sessionId = params.get('session_id');
  const [ready,   setReady] = useState(false);

  useEffect(() => {
    // Small delay so webhook has time to update DB
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const s = {
    wrap:  { textAlign: 'center' as const, padding: '60px 0' },
    icon:  { fontSize: 56, marginBottom: 24 },
    h1:    { fontSize: 28, fontWeight: 800, color: '#1c1b22', marginBottom: 12 },
    sub:   { fontSize: 16, color: '#6b6760', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' },
    btn:   { display: 'inline-block', background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '12px 28px', borderRadius: 9, textDecoration: 'none', fontSize: 15 },
    sec:   { display: 'inline-block', background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '12px 28px', borderRadius: 9, textDecoration: 'none', fontSize: 15, marginLeft: 12 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.icon}>🎉</div>
      <h1 style={s.h1}>You're all set!</h1>
      <p style={s.sub}>
        Your {PRODUCT_NAME} subscription is now active. All features are unlocked for your team.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {ready
          ? <Link href="/dashboard" style={s.btn}>Go to Dashboard →</Link>
          : <div style={{ color: '#6b6760', fontSize: 14 }}>Activating your account…</div>
        }
        <Link href="/billing" style={s.sec}>View Billing</Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center' as const, color: '#6b6760', padding: 60 }}>Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
