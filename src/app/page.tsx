import Link from 'next/link';
import { PRODUCT_NAME, PRODUCT_TAGLINE, PLANS } from '@/lib/product';

const s = {
  page:    { minHeight: '100vh', background: '#1c1b22', color: '#faf8f4' },
  nav:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #34313d' },
  logo:    { fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' },
  navLinks:{ display: 'flex', gap: 16, alignItems: 'center' },
  hero:    { maxWidth: 700, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' as const },
  h1:      { fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' },
  tagline: { fontSize: 20, color: '#a8a39a', marginBottom: 40, lineHeight: 1.5 },
  ctas:    { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const },
  ctaPri:  { background: '#4f46e5', color: '#fff', padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 16, display: 'inline-block', textDecoration: 'none' },
  ctaSec:  { background: '#34313d', color: '#e9e4da', padding: '14px 32px', borderRadius: 8, fontWeight: 600, fontSize: 16, display: 'inline-block', textDecoration: 'none', border: '1px solid #34313d' },
  features:{ maxWidth: 900, margin: '0 auto 80px', padding: '0 24px' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginTop: 40 },
  feat:    { background: '#34313d', border: '1px solid #34313d', borderRadius: 10, padding: '24px 20px' },
  featIco: { fontSize: 28, marginBottom: 12 },
  featTit: { fontWeight: 700, fontSize: 16, marginBottom: 6 },
  featTxt: { color: '#a8a39a', fontSize: 14, lineHeight: 1.6 },
  pricing: { maxWidth: 900, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' as const },
  h2:      { fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' },
  sub:     { color: '#a8a39a', marginBottom: 40 },
  pGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  pCard:   { background: '#34313d', border: '1px solid #34313d', borderRadius: 10, padding: 24 },
  pName:   { fontWeight: 700, marginBottom: 4 },
  pPrice:  { fontSize: 28, fontWeight: 800, color: '#4f46e5', margin: '8px 0' },
  pPer:    { color: '#a8a39a', fontSize: 13, marginBottom: 16 },
  footer:  { borderTop: '1px solid #34313d', padding: '24px 40px', textAlign: 'center' as const, color: '#6b6760', fontSize: 13 },
} as const;

const FEATURES = [
  { icon: '🏨', title: 'Multi-property, one system', text: 'Manage all your hotels from a single login. GMs and HR see only their property.' },
  { icon: '📋', title: 'Smart onboarding', text: 'State-aware form checklists. W-4, I-9, and state forms auto-populated by property location.' },
  { icon: '📄', title: 'Offer letter generator', text: 'Professional offer letters in seconds. Print to PDF directly from the browser.' },
  { icon: '📦', title: 'Bulk document export', text: 'Download a ZIP of every onboarding document for any employee in one click.' },
  { icon: '👥', title: 'Role-based access', text: 'Owners see everything. GMs and HR see only what\'s theirs.' },
  { icon: '🤝', title: 'Built for independents', text: 'Not Hilton corporate. Not a 10-person operation. Built for 3–30 properties.' },
];

export default function HomePage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo}>{PRODUCT_NAME}</span>
        <div style={s.navLinks}>
          <Link href="/login" style={{ color: '#a8a39a', fontSize: 14 }}>Sign in</Link>
          <Link href="/signup" style={s.ctaPri}>Start free trial</Link>
        </div>
      </nav>

      <section style={s.hero}>
        <h1 style={s.h1}>HR software built for<br />hotel operators</h1>
        <p style={s.tagline}>{PRODUCT_TAGLINE}<br />$3–5 per employee. No per-seat pricing. No fluff.</p>
        <div style={s.ctas}>
          <Link href="/signup" style={s.ctaPri}>Start your 14-day free trial</Link>
          <Link href="/login" style={s.ctaSec}>Sign in</Link>
        </div>
      </section>

      <section style={s.features}>
        <h2 style={{ ...s.h2, textAlign: 'center' }}>Everything you need. Nothing you don&apos;t.</h2>
        <div style={s.grid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.feat}>
              <div style={s.featIco}>{f.icon}</div>
              <div style={s.featTit}>{f.title}</div>
              <p style={s.featTxt}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={s.pricing}>
        <h2 style={s.h2}>Simple pricing</h2>
        <p style={s.sub}>Per active employee, per month. Cancel anytime.</p>
        <div style={s.pGrid}>
          {(['starter', 'growth', 'enterprise'] as const).map(k => {
            const p = PLANS[k];
            return (
              <div key={k} style={{ ...s.pCard, ...(k === 'growth' ? { border: '2px solid #4f46e5' } : {}) }}>
                <div style={s.pName}>{p.label}</div>
                <div style={s.pPrice}>${( (p as any).pricePerSeat ?? (p as any).pricePerEmployee ?? 0)}</div>
                <div style={s.pPer}>per employee / month</div>
                {k === 'growth' && <div style={{ fontSize: 12, color: '#22c55e', marginBottom: 8, fontWeight: 600 }}>MOST POPULAR</div>}
              </div>
            );
          })}
        </div>
        <p style={{ color: '#6b6760', marginTop: 24, fontSize: 13 }}>All plans include a 14-day free trial. No credit card required.</p>
      </section>

      <footer style={s.footer}>
        © {new Date().getFullYear()} {PRODUCT_NAME}. Built for independent hotel operators.
      </footer>
    </div>
  );
}
