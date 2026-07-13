import Link from 'next/link';
import { PRODUCT_NAME } from '@/lib/product';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#faf8f4', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <header style={{ background: '#1c1b22', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 17, color: '#fff', textDecoration: 'none' }}>{PRODUCT_NAME}</Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#a8a39a', textDecoration: 'none' }}>← Back to dashboard</Link>
      </header>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        {children}
      </main>
    </div>
  );
}
