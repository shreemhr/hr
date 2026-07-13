import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { PRODUCT_NAME, PLANS, trialDaysLeft, isInGracePeriod, isPlanActive } from '@/lib/product';
import { supabase } from '@/lib/supabase';
import AppShell from './AppShell';

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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <AppShell
      productName={PRODUCT_NAME}
      isAdmin={isAdmin}
      pendingCount={pendingCount}
      pendingExceptions={pendingExceptions}
      planKey={planKey}
      planLabel={plan?.label}
      daysLeft={daysLeft}
      overSeats={overSeats}
      sessionName={session.name}
      sessionEmail={session.email}
      billingBanner={showBillingBanner ? (
        <BillingBanner
          planKey={planKey}
          daysLeft={daysLeft}
          active={active}
          grace={grace}
          overSeats={overSeats}
          empCount={empCount}
          seatLimit={seatLimit}
        />
      ) : null}
    >
      {children}
    </AppShell>
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
