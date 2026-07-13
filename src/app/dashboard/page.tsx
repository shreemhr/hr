import { requireSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PRODUCT_NAME, TRIAL_DAYS } from '@/lib/product';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await requireSession();
  const { companyId } = session;

  const [{ data: company }, { count: empCount }, { count: propCount }, { count: pendingOnboarding }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', companyId).single(),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('onboarding_tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
  ]);

  // Open positions = sum of (headcount_target - active employees in role) across roles with a target
  const [{ data: targetPositions }, { data: activeEmps }] = await Promise.all([
    supabase.from('positions').select('id, headcount_target').eq('company_id', companyId).not('headcount_target', 'is', null),
    supabase.from('employees').select('position_id').eq('company_id', companyId).eq('status', 'active'),
  ]);
  const fillCounts = new Map<string, number>();
  for (const e of activeEmps ?? []) {
    if (e.position_id) fillCounts.set(e.position_id, (fillCounts.get(e.position_id) ?? 0) + 1);
  }
  const openPositions = (targetPositions ?? []).reduce(
    (sum, p) => sum + Math.max(0, (p.headcount_target ?? 0) - (fillCounts.get(p.id) ?? 0)),
    0,
  );

  const trialEnd = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const isTrialing = company?.plan === 'trial';

  const setupDone = {
    branding:   !!(company?.legal_name),
    properties: (propCount ?? 0) > 0,
    employees:  (empCount ?? 0) > 0,
  };

  return (
    <DashboardClient
      productName={PRODUCT_NAME}
      companyName={company?.name ?? ''}
      isTrialing={isTrialing}
      daysLeft={daysLeft}
      trialDays={TRIAL_DAYS}
      empCount={empCount ?? 0}
      propCount={propCount ?? 0}
      pendingOnboarding={pendingOnboarding ?? 0}
      openPositions={openPositions}
      setupDone={setupDone}
      role={session.role ?? 'hr'}
    />
  );
}
