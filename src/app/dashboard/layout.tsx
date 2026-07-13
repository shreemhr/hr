import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { PRODUCT_NAME, PLANS, trialDaysLeft, isInGracePeriod, isPlanActive } from '@/lib/product';
import { supabase } from '@/lib/supabase';

async function getCompanyBillingState(companyId: string) {
  const { data: company } = await supabase
    .from('companies')
    .select('plan, trial_ends_at, subscription_status, current_period_end')
    .eq('id', companyId)
    .single();
  return company;
}

async function getPendingOnboardingCount(companyId: string) {
  const { count } = await supabase
    .from('onboarding_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending');
  return count ?? 0;
}

async function getActiveEmployeeCount(companyId: string) {
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active');
  return count ?? 0;
}

async function getPendingExceptionCount(companyId: string) {
  const { count } = await supabase
    .from('pay_exceptions')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending');
  return count ?? 0;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session      = await requireSession();
  const [company, pendingCount, empCount, pendingExceptions] = await Promise.all([
    getCompanyBillingState(session.companyId),
    getPendingOnboardingCount(session.companyId),
    getActiveEmployeeCount(session.companyId),
    getPendingExceptionCount(session.companyId),
  ]);

  const isAdmin   = session.role === 'owner' || session.role === 'vp_ops';
  const planKey   = (company?.plan ?? 'trial') as keyof typeof PLANS;
  const plan      = PLANS[planKey];
  const subStatus = company?.subscription_status ?? null;
  const daysLeft  = trialDaysLeft(company?.trial_ends_at ?? null);
  const active    = isPlanActive(subStatus as any, company?.trial_ends_at ?? null);
  const grace     = isInGracePeriod(subStatus as any, company?.trial_ends_at ?? null);
  const seatLimit = plan?.seatLimit ?? null;
  const overSeats = seatLimit ? empCount > seatLimit : false;
  const showBillingBanner = isAdmin && (!active || grace || overSeats || (planKey === 'trial' && daysLeft <= 3));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf8f4' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1c1b22', color: '#e9e4da',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '22px 20px 16px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #34313d' }}>
          <span style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(150deg, #d9b160, #b5832e)',
            display: 'grid', placeItems: 'center',
            fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1c1b22', fontSize: 19,
            boxShadow: '0 2px 8px rgba(181,131,46,.35)', flexShrink: 0,
          }}>{PRODUCT_NAME.charAt(0)}</span>
          <span className="serif" style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 19, color: '#fff', letterSpacing: '.2px' }}>
            {PRODUCT_NAME}
          </span>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <NavItem href="/dashboard" label="Dashboard" icon="⬜" />
          {isAdmin && <>
            <div style={{ padding: '14px 20px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6b6760', letterSpacing: '0.08em' }}>Admin</div>
            <NavItem href="/admin/properties" label="Properties"  icon="🏨" />
            <NavItem href="/admin/positions"  label="Positions"   icon="💼" />
            <NavItem href="/admin/compensation" label="Compensation" icon="💵" badge={pendingExceptions > 0 ? pendingExceptions : undefined} badgeBrass />
            <NavItem href="/admin/users"      label="Users"       icon="🔑" />
            <NavItem href="/admin/checklists" label="Checklists"  icon="✅" />
          </>}
          <div style={{ padding: '14px 20px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6b6760', letterSpacing: '0.08em' }}>HR</div>
          <NavItem href="/employees"  label="Employees"  icon="☺" />
          <NavItem href="/onboarding" label="Check-in" icon="🔔" badge={pendingCount > 0 ? pendingCount : undefined} />
          <NavItem href="/documents"  label="Documents"  icon="📄" />
          <div style={{ padding: '14px 20px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6b6760', letterSpacing: '0.08em' }}>Reports</div>
          <NavItem href="/reports/hiring"      label="Hiring Needs" icon="🎯" />
          <NavItem href="/reports/turnover"    label="Turnover"     icon="📉" />
          <NavItem href="/reports/recognition" label="Recognition"  icon="⭐" />
        </nav>
        {/* Plan badge + billing link */}
        {isAdmin && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #34313d' }}>
            <Link href="/billing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: '#6b6760' }}>
                {planKey === 'trial' ? `Trial · ${daysLeft}d left` : plan?.label}
              </span>
              <span style={{ fontSize: 10, background: overSeats ? '#c0392b' : planKey === 'trial' ? '#c2780c' : '#16794a', color: '#fff', borderRadius: 999, padding: '2px 7px', fontWeight: 700 }}>
                {overSeats ? 'Over limit' : planKey === 'trial' ? 'Upgrade' : 'Active'}
              </span>
            </Link>
          </div>
        )}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #34313d' }}>
          <div style={{ fontSize: 12, color: '#6b6760', marginBottom: 4 }}>{session.name}</div>
          <div style={{ fontSize: 11, color: '#34313d', marginBottom: 10 }}>{session.email}</div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: 'transparent', color: '#6b6760', fontSize: 12, padding: '4px 0', border: 'none', cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Billing banner */}
        {showBillingBanner && (
          <BillingBanner
            planKey={planKey}
            daysLeft={daysLeft}
            active={active}
            grace={grace}
            overSeats={overSeats}
            empCount={empCount}
            seatLimit={seatLimit}
          />
        )}
        {children}
      </main>
    </div>
  );
}

function BillingBanner({ planKey, daysLeft, active, grace, overSeats, empCount, seatLimit }: {
  planKey: string; daysLeft: number; active: boolean; grace: boolean;
  overSeats: boolean; empCount: number; seatLimit: number | null;
}) {
  const isExpired = planKey === 'trial' && daysLeft === 0 && !active;

  let bg    = '#fbf1de';
  let color = '#8a5a13';
  let msg   = `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`;

  if (isExpired || (!active && !grace)) {
    bg = '#fae9e7'; color = '#7d3229';
    msg = 'Your trial has expired. Upgrade to continue using ShreemHR.';
  } else if (grace) {
    bg = '#fae9e7'; color = '#7d3229';
    msg = 'Payment past due — please update your billing information to avoid service interruption.';
  } else if (overSeats && seatLimit) {
    bg = '#fae9e7'; color = '#7d3229';
    msg = `Over seat limit — you have ${empCount} employees but your plan allows ${seatLimit}. Upgrade to continue adding employees.`;
  } else if (daysLeft <= 3 && planKey === 'trial') {
    bg = '#fae9e7'; color = '#7d3229';
    msg = `Trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Add billing info to avoid interruption.`;
  }

  return (
    <div style={{ background: bg, borderBottom: `1px solid ${color}22`, padding: '11px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color, fontWeight: 600 }}>{msg}</span>
      <Link href="/billing" style={{ background: '#4f46e5', color: '#fff', fontWeight: 700, padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12, flexShrink: 0, marginLeft: 16 }}>
        {planKey === 'trial' ? 'Upgrade now' : 'Manage billing'}
      </Link>
    </div>
  );
}

function NavItem({ href, label, icon, badge, badgeBrass }: { href: string; label: string; icon: string; badge?: number; badgeBrass?: boolean }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', color: '#a8a39a', fontSize: 14, textDecoration: 'none', transition: 'background 0.1s' }}
      className="nav-item">
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span style={{ background: badgeBrass ? '#b5832e' : '#c0392b', color: badgeBrass ? '#1c1b22' : '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
          {badge}
        </span>
      )}
    </Link>
  );
}
