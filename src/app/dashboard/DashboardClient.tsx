'use client';
import { useRouter } from 'next/navigation';

interface Props {
  productName:      string;
  companyName:      string;
  isTrialing:       boolean;
  daysLeft:         number;
  trialDays:        number;
  empCount:         number;
  propCount:        number;
  pendingOnboarding:number;
  openPositions:    number;
  setupDone:        { branding: boolean; properties: boolean; employees: boolean };
  role:             string;
}

export default function DashboardClient(p: Props) {
  const router = useRouter();
  const isAdmin = p.role === 'owner' || p.role === 'vp_ops';

  const s = {
    page:  { padding: 32, maxWidth: 900 },
    head:  { marginBottom: 28 },
    h1:    { fontSize: 24, fontWeight: 800, color: '#1c1b22', margin: 0 },
    sub:   { color: '#6b6760', marginTop: 4, fontSize: 14 },
    trial: { background: p.daysLeft <= 3 ? '#fae9e7' : '#fbf1de', border: `1px solid ${p.daysLeft <= 3 ? '#f0c8c2' : '#fde68a'}`, borderRadius: 8, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    trialTxt: { color: p.daysLeft <= 3 ? '#c0392b' : '#8a5a13', fontWeight: 600, fontSize: 14 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 },
    stat:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: '20px 24px' },
    statN: { fontSize: 32, fontWeight: 800, color: '#1c1b22' },
    statL: { fontSize: 13, color: '#6b6760', marginTop: 4 },
    setup: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 10, padding: 24, marginBottom: 24 },
    setupH: { fontWeight: 700, fontSize: 16, marginBottom: 16 },
    setupGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
    card:  { border: '1px solid #e9e4da', borderRadius: 8, padding: '16px 18px', cursor: 'pointer' },
    cardT: { fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
    cardD: { fontSize: 12, color: '#6b6760' },
  } as const;

  return (
    <div style={s.page}>
      <div style={s.head}>
        <h1 style={s.h1}>Welcome back{p.companyName ? `, ${p.companyName}` : ''}</h1>
        <p style={s.sub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {p.isTrialing && (
        <div style={s.trial}>
          <span style={s.trialTxt}>
            {p.daysLeft > 0 ? `⏳ Trial: ${p.daysLeft} day${p.daysLeft !== 1 ? 's' : ''} remaining` : '⚠️ Trial expired'}
          </span>
          <button onClick={() => router.push('/dashboard/settings#billing')} style={{ background: '#4f46e5', color: '#fff', fontWeight: 600, borderRadius: 6, padding: '6px 14px', fontSize: 13 }}>
            Upgrade →
          </button>
        </div>
      )}

      <div style={s.statsRow}>
        <div style={s.stat}>
          <div style={s.statN}>{p.propCount}</div>
          <div style={s.statL}>Propert{p.propCount === 1 ? 'y' : 'ies'}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statN}>{p.empCount}</div>
          <div style={s.statL}>Active employee{p.empCount === 1 ? '' : 's'}</div>
        </div>
        <div style={{ ...s.stat, cursor: p.pendingOnboarding > 0 ? 'pointer' : 'default' }} onClick={() => p.pendingOnboarding > 0 && router.push('/onboarding')}>
          <div style={{ ...s.statN, color: p.pendingOnboarding > 0 ? '#c0392b' : '#1c1b22' }}>{p.pendingOnboarding}</div>
          <div style={s.statL}>Pending onboarding tasks</div>
        </div>
        <div style={{ ...s.stat, cursor: 'pointer' }} onClick={() => router.push('/reports/hiring')}>
          <div style={{ ...s.statN, color: p.openPositions > 0 ? '#c0392b' : '#1c1b22' }}>{p.openPositions}</div>
          <div style={s.statL}>Open position{p.openPositions === 1 ? '' : 's'} to fill</div>
        </div>
      </div>

      {isAdmin && (
        <div style={s.setup}>
          <div style={s.setupH}>⚡ Setup checklist</div>
          <div style={s.setupGrid}>
            <SetupCard done={p.setupDone.branding}    icon="🏢" title="Company details"  desc="Add your legal name and EIN for offer letters." cta="Settings"   onClick={() => router.push('/dashboard/settings')} />
            <SetupCard done={p.setupDone.properties}  icon="🏨" title="Add properties"   desc="Add each hotel — state drives which forms apply." cta="Properties" onClick={() => router.push('/admin/properties')} />
            <SetupCard done={p.setupDone.employees}   icon="👥" title="Add employees"    desc="Add your team and start onboarding them."         cta="Employees"  onClick={() => router.push('/employees')} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <QuickLink icon="📋" label="Onboarding queue" sub={`${p.pendingOnboarding} pending tasks`} href="/onboarding" hot={p.pendingOnboarding > 0} onClick={() => router.push('/onboarding')} />
        <QuickLink icon="📄" label="Documents"        sub="Offer letters & exports"                href="/documents" onClick={() => router.push('/documents')} />
        <QuickLink icon="👥" label="Employees"        sub={`${p.empCount} active`}                 href="/employees" onClick={() => router.push('/employees')} />
        {isAdmin && <QuickLink icon="🏨" label="Properties" sub={`${p.propCount} hotel${p.propCount === 1 ? '' : 's'}`} href="/admin/properties" onClick={() => router.push('/admin/properties')} />}
      </div>
    </div>
  );
}

function SetupCard({ done, icon, title, desc, cta, onClick }: { done: boolean; icon: string; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ border: `1px solid ${done ? '#bbf7d0' : '#e9e4da'}`, background: done ? '#e8f3ec' : '#fff', borderRadius: 8, padding: '16px 18px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        <span>{done ? '✅' : '⬜'}</span>{title}
      </div>
      <div style={{ fontSize: 12, color: '#6b6760', marginBottom: 10 }}>{desc}</div>
      <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{done ? 'View →' : `${cta} →`}</span>
    </div>
  );
}

function QuickLink({ icon, label, sub, onClick, hot }: { icon: string; label: string; sub: string; href: string; onClick: () => void; hot?: boolean }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${hot ? '#f0c8c2' : '#e9e4da'}`, borderRadius: 10, padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1c1b22' }}>{label}</div>
        <div style={{ fontSize: 12, color: hot ? '#c0392b' : '#6b6760', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
