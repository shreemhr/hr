import { PRODUCT_NAME } from '@/lib/product';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#faf8f4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        background: '#1c1b22', color: '#fff',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
          {PRODUCT_NAME}
          <span style={{ marginLeft: 10, fontWeight: 400, fontSize: 12, color: '#6b6760', letterSpacing: 0 }}>
            Employee Portal
          </span>
        </div>
        <form action="/api/portal/logout" method="POST">
          <button
            type="submit"
            style={{ background: 'transparent', color: '#6b6760', border: 'none', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
          >
            Sign out
          </button>
        </form>
      </header>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  );
}
