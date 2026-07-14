'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PRODUCT_NAME, PRODUCT_TAGLINE, PLANS } from '@/lib/product';

const s = {
  page:    { minHeight: '100vh', background: '#1c1b22', color: '#faf8f4', overflowX: 'hidden' as const },
  nav:     { position: 'sticky' as const, top: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', borderBottom: '1px solid #34313d', background: 'rgba(28,27,34,0.85)', backdropFilter: 'blur(8px)' },
  logo:    { fontFamily: "'Fraunces', Georgia, serif", fontSize: 21, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' },
  dot:     { color: '#d9b160' },
  navLinks:{ display: 'flex', gap: 28, alignItems: 'center' },
  navLink: { color: '#a8a39a', fontSize: 14, textDecoration: 'none' },
  hero:    { maxWidth: 1080, margin: '0 auto', padding: '90px 24px 40px', textAlign: 'center' as const, position: 'relative' as const },
  glow:    { position: 'absolute' as const, top: -80, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(181,131,46,0.14), transparent 70%)', pointerEvents: 'none' as const, zIndex: 0 },
  eyebrow: { display: 'inline-block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#d9b160', background: 'rgba(181,131,46,0.12)', border: '1px solid rgba(181,131,46,0.3)', borderRadius: 999, padding: '5px 14px', marginBottom: 22 },
  h1:      { fontFamily: "'Fraunces', Georgia, serif", fontSize: 52, fontWeight: 600, lineHeight: 1.12, marginBottom: 20, letterSpacing: '-0.5px', position: 'relative' as const },
  tagline: { fontSize: 19, color: '#a8a39a', marginBottom: 36, lineHeight: 1.55, maxWidth: 620, margin: '0 auto 36px' },
  ctas:    { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 16 },
  ctaPri:  { background: '#4f46e5', color: '#fff', padding: '15px 32px', borderRadius: 9, fontWeight: 700, fontSize: 16, display: 'inline-block', textDecoration: 'none', boxShadow: '0 8px 24px rgba(79,70,229,0.35)' },
  ctaSec:  { background: '#2a2833', color: '#e9e4da', padding: '15px 32px', borderRadius: 9, fontWeight: 600, fontSize: 16, display: 'inline-block', textDecoration: 'none', border: '1px solid #3a3745' },
  microcopy: { fontSize: 13, color: '#6b6760' },

  mockWrap:{ maxWidth: 920, margin: '56px auto 0', padding: '0 24px', position: 'relative' as const },
  mockChrome: { background: '#2a2833', border: '1px solid #3a3745', borderRadius: '14px 14px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  mockDot: (c: string) => ({ width: 10, height: 10, borderRadius: 999, background: c }),
  mockBody:{ background: '#faf8f4', borderRadius: '0 0 14px 14px', border: '1px solid #3a3745', borderTop: 'none', display: 'flex', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' },
  mockSide:{ width: 130, background: '#1c1b22', padding: '18px 14px', flexShrink: 0 },
  mockNavItem: (active?: boolean) => ({ fontSize: 11, color: active ? '#fff' : '#7a7686', padding: '7px 8px', borderRadius: 5, marginBottom: 3, background: active ? 'rgba(255,255,255,0.06)' : 'transparent' }),
  mockMain:{ flex: 1, padding: '22px 26px', textAlign: 'left' as const },
  mockStatRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 },
  mockStat:{ background: '#fff', border: '1px solid #e9e4da', borderRadius: 8, padding: '10px 12px' },

  section: { maxWidth: 1080, margin: '0 auto', padding: '100px 24px' },
  eyebrowSm: { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#4f46e5', marginBottom: 10, textAlign: 'center' as const },
  h2:      { fontFamily: "'Fraunces', Georgia, serif", fontSize: 34, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.3px', textAlign: 'center' as const },
  sub:     { color: '#a8a39a', marginBottom: 48, textAlign: 'center' as const, fontSize: 16, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' },

  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  feat:    { background: '#2a2833', border: '1px solid #34313d', borderRadius: 14, padding: '28px 24px' },
  featIco: { width: 46, height: 46, borderRadius: 11, background: 'rgba(181,131,46,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, marginBottom: 16 },
  featTit: { fontWeight: 700, fontSize: 16.5, marginBottom: 8 },
  featTxt: { color: '#a8a39a', fontSize: 14, lineHeight: 1.65 },

  steps:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28, position: 'relative' as const },
  stepNum: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#4f46e5', marginBottom: 10, opacity: 0.9 },
  stepTit: { fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#fff' },
  stepTxt: { color: '#a8a39a', fontSize: 14, lineHeight: 1.6 },

  pGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 },
  pCard:   { background: '#2a2833', border: '1px solid #34313d', borderRadius: 14, padding: 28 },
  pName:   { fontWeight: 700, fontSize: 16, marginBottom: 6 },
  pDesc:   { fontSize: 13, color: '#a8a39a', marginBottom: 18, minHeight: 34 },
  pPrice:  { fontSize: 34, fontWeight: 800, color: '#fff' },
  pPer:    { color: '#a8a39a', fontSize: 13, marginBottom: 20 },
  pFeat:   { fontSize: 13, color: '#c8c4bc', lineHeight: 2, marginBottom: 22, borderTop: '1px solid #3a3745', paddingTop: 18 },

  faqItem: { borderBottom: '1px solid #34313d', padding: '20px 0' },
  faqQ:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: 16, gap: 16 },
  faqA:    { color: '#a8a39a', fontSize: 14.5, lineHeight: 1.7, marginTop: 12, maxWidth: 720 },

  finalCta:{ maxWidth: 780, margin: '0 auto', padding: '90px 24px', textAlign: 'center' as const },
  finalBox:{ background: 'linear-gradient(150deg, #2a2833, #1f1e26)', border: '1px solid #3a3745', borderRadius: 20, padding: '56px 40px' },

  footer:  { borderTop: '1px solid #34313d', padding: '48px 40px 28px' },
  footGrid:{ maxWidth: 1080, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 32, marginBottom: 32 },
  footCol: { minWidth: 160 },
  footH:   { fontSize: 12, fontWeight: 700, color: '#6b6760', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 14 },
  footLink:{ display: 'block', color: '#a8a39a', fontSize: 14, textDecoration: 'none', marginBottom: 10 },
  footBottom: { maxWidth: 1080, margin: '0 auto', borderTop: '1px solid #34313d', paddingTop: 24, textAlign: 'center' as const, color: '#6b6760', fontSize: 13 },
} as const;

const FEATURES = [
  { icon: '🏨', title: 'Multi-property, one system', text: 'Manage all your hotels from a single login. GMs and HR see only their property.' },
  { icon: '📋', title: 'Smart onboarding', text: 'State-aware form checklists. W-4, I-9, and state forms auto-populated by property location.' },
  { icon: '📄', title: 'Offer letter generator', text: 'Professional offer letters in seconds. Print to PDF directly from the browser.' },
  { icon: '📦', title: 'Bulk document export', text: 'Download a ZIP of every onboarding document for any employee in one click.' },
  { icon: '👥', title: 'Role-based access', text: 'Owners see everything. GMs and HR see only what\'s theirs.' },
  { icon: '🤝', title: 'Built for independents', text: 'Not Hilton corporate. Not a 10-person operation. Built for 3–30 properties.' },
];

const STEPS = [
  { title: 'Add your properties & team', text: 'Set up each hotel and invite your GMs and HR staff — takes about 10 minutes.' },
  { title: 'Onboard employees automatically', text: 'Add a new hire and ShreemHR generates the right federal and state forms for their location.' },
  { title: 'Run HR from one place', text: 'Track pay bands, reviews, disciplinary records, and recognition — across every property.' },
];

const FAQS = [
  { q: 'How long does setup take?', a: 'Most operators are fully set up in under 30 minutes — add your properties, invite your team, and start onboarding employees the same day. No implementation calls required.' },
  { q: 'Do I need to migrate data from another system?', a: 'You can start fresh with new hires immediately, and add existing employees whenever you\'re ready — there\'s no forced migration step or minimum data import.' },
  { q: 'Is there a contract or commitment?', a: 'No. Plans are billed monthly per active employee and you can cancel anytime — no annual contracts, no cancellation fees.' },
  { q: 'What happens after my free trial?', a: 'You get 14 days free with full access, no credit card required to start. After that, pick the plan that fits your property count — or keep using the free tier features that remain available.' },
  { q: 'Is my data secure?', a: 'Yes — every account is isolated by company, role-based access controls limit what GMs and HR staff can see, and all data is encrypted in transit and at rest.' },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo}>{PRODUCT_NAME}<span style={s.dot}>.</span></span>
        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#pricing" style={s.navLink}>Pricing</a>
          <a href="#faq" style={s.navLink}>FAQ</a>
          <Link href="/login" style={s.navLink}>Sign in</Link>
          <Link href="/signup" style={{ ...s.ctaPri, padding: '9px 20px', fontSize: 14, boxShadow: 'none' }} className="hover-lift">Start free trial</Link>
        </div>
      </nav>

      <section style={s.hero}>
        <div style={s.glow} />
        <div className="animate-in" style={{ '--d': '0s', position: 'relative' } as React.CSSProperties}>
          <span style={s.eyebrow}>For independent hotel operators</span>
        </div>
        <h1 style={{ ...s.h1, '--d': '0.08s' } as React.CSSProperties} className="animate-in">HR software built for<br />hotel operators</h1>
        <p style={{ ...s.tagline, '--d': '0.15s' } as React.CSSProperties} className="animate-in">{PRODUCT_TAGLINE}<br />$3–5 per employee. No per-seat pricing. No fluff.</p>
        <div style={{ ...s.ctas, '--d': '0.22s' } as React.CSSProperties} className="animate-in">
          <Link href="/signup" style={s.ctaPri} className="hover-lift">Start your 14-day free trial</Link>
          <Link href="/login" style={s.ctaSec} className="hover-lift">Sign in</Link>
        </div>
        <div style={{ '--d': '0.28s' } as React.CSSProperties} className="animate-in">
          <p style={s.microcopy}>No credit card required · Cancel anytime</p>
        </div>

        {/* Product mockup */}
        <div style={{ ...s.mockWrap, '--d': '0.35s' } as React.CSSProperties} className="animate-in-scale">
          <div style={s.mockChrome}>
            <span style={s.mockDot('#ff5f57')} /><span style={s.mockDot('#febc2e')} /><span style={s.mockDot('#28c840')} />
          </div>
          <div style={s.mockBody}>
            <div style={s.mockSide}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(150deg, #d9b160, #b5832e)', marginBottom: 16 }} />
              <div style={s.mockNavItem(true)}>Dashboard</div>
              <div style={s.mockNavItem()}>Properties</div>
              <div style={s.mockNavItem()}>Employees</div>
              <div style={s.mockNavItem()}>Check-in</div>
              <div style={s.mockNavItem()}>Reports</div>
            </div>
            <div style={s.mockMain}>
              <div style={{ height: 12, width: 160, background: '#e9e4da', borderRadius: 4 }} />
              <div style={{ height: 8, width: 100, background: '#f4f2ee', borderRadius: 4, marginTop: 8 }} />
              <div style={s.mockStatRow}>
                {['Properties', 'Employees', 'Onboarding', 'Open roles'].map(l => (
                  <div key={l} style={s.mockStat}>
                    <div style={{ height: 16, width: 24, background: '#1c1b22', borderRadius: 3, opacity: 0.85 }} />
                    <div style={{ fontSize: 9, color: '#a8a39a', marginTop: 6 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.section} id="features">
        <div style={s.eyebrowSm}>Everything included</div>
        <h2 style={s.h2}>Everything you need. Nothing you don&apos;t.</h2>
        <p style={s.sub}>No modules to enable, no add-on pricing — every plan gets the full feature set.</p>
        <div style={s.grid}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{ ...s.feat, '--d': `${i * 0.06}s` } as React.CSSProperties} className="animate-in card-hover">
              <div style={s.featIco}>{f.icon}</div>
              <div style={s.featTit}>{f.title}</div>
              <p style={s.featTxt}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={s.section}>
        <div style={s.eyebrowSm}>Get started fast</div>
        <h2 style={s.h2}>Up and running in one afternoon</h2>
        <p style={s.sub}>No sales calls, no implementation fees, no waiting.</p>
        <div style={s.steps}>
          {STEPS.map((step, i) => (
            <div key={step.title} style={{ '--d': `${i * 0.08}s` } as React.CSSProperties} className="animate-in">
              <div style={s.stepNum}>{String(i + 1).padStart(2, '0')}</div>
              <div style={s.stepTit}>{step.title}</div>
              <p style={s.stepTxt}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={s.section} id="pricing">
        <div style={s.eyebrowSm}>Simple pricing</div>
        <h2 style={s.h2}>One price. Every feature.</h2>
        <p style={s.sub}>Per active employee, per month. Cancel anytime.</p>
        <div style={s.pGrid}>
          {(['starter', 'growth', 'enterprise'] as const).map((k, i) => {
            const p = PLANS[k];
            return (
              <div
                key={k}
                style={{ ...s.pCard, ...(k === 'growth' ? { border: '2px solid #4f46e5' } : {}), '--d': `${i * 0.08}s` } as React.CSSProperties}
                className="animate-in card-hover"
              >
                {k === 'growth' && <div className="animate-pulse-soft" style={{ fontSize: 11, color: '#22c55e', marginBottom: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Most popular</div>}
                <div style={s.pName}>{p.label}</div>
                <div style={s.pDesc}>{p.description}</div>
                <div style={s.pPrice}>${p.pricePerSeat}</div>
                <div style={s.pPer}>per employee / month</div>
                <div style={s.pFeat}>
                  {p.seatLimit ? `Up to ${p.seatLimit} employees` : 'Unlimited employees'}<br />
                  {p.propertyLimit ? `Up to ${p.propertyLimit} properties` : 'Unlimited properties'}<br />
                  All HR features included<br />
                  Employee self-service portal
                </div>
                <Link href="/signup" style={{ ...s.ctaPri, display: 'block', textAlign: 'center', width: '100%', boxSizing: 'border-box', padding: '12px', fontSize: 14, boxShadow: 'none' }} className="hover-lift">
                  Start free trial
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section style={s.section} id="faq">
        <div style={s.eyebrowSm}>Questions</div>
        <h2 style={s.h2}>Frequently asked questions</h2>
        <p style={s.sub}>Can&apos;t find what you&apos;re looking for? Reach out and we&apos;ll get back to you quickly.</p>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {FAQS.map((f, i) => (
            <div key={f.q} style={s.faqItem}>
              <div style={s.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span>
                <span style={{ color: '#4f46e5', fontSize: 20, flexShrink: 0, transition: 'transform 0.2s ease', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
              </div>
              {openFaq === i && <p style={s.faqA} className="animate-in">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={s.finalCta}>
        <div style={s.finalBox}>
          <h2 style={{ ...s.h2, marginBottom: 14 }}>Ready to simplify your HR?</h2>
          <p style={{ ...s.sub, marginBottom: 28 }}>Start your 14-day free trial today. No credit card, no sales calls.</p>
          <Link href="/signup" style={s.ctaPri} className="hover-lift">Start your free trial →</Link>
        </div>
      </section>

      <footer style={s.footer}>
        <div style={s.footGrid}>
          <div style={{ maxWidth: 260 }}>
            <span style={s.logo}>{PRODUCT_NAME}<span style={s.dot}>.</span></span>
            <p style={{ color: '#6b6760', fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>Hotel workforce management built for independent operators — not enterprise chains.</p>
          </div>
          <div style={s.footCol}>
            <div style={s.footH}>Product</div>
            <a href="#features" style={s.footLink}>Features</a>
            <a href="#pricing" style={s.footLink}>Pricing</a>
            <a href="#faq" style={s.footLink}>FAQ</a>
          </div>
          <div style={s.footCol}>
            <div style={s.footH}>Account</div>
            <Link href="/login" style={s.footLink}>Sign in</Link>
            <Link href="/signup" style={s.footLink}>Start free trial</Link>
          </div>
        </div>
        <div style={s.footBottom}>
          © {new Date().getFullYear()} {PRODUCT_NAME}. Built for independent hotel operators.
        </div>
      </footer>
    </div>
  );
}
