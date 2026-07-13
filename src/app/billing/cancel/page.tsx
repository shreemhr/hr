import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>↩</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1b22', marginBottom: 12 }}>Checkout cancelled</h1>
      <p style={{ color: '#6b6760', marginBottom: 28 }}>No changes were made to your account.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link href="/billing" style={{ display: 'inline-block', background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>
          Back to Plans
        </Link>
        <Link href="/dashboard" style={{ display: 'inline-block', background: '#f4f2ee', color: '#6b6760', fontWeight: 600, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
