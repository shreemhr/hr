import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';
import { PLANS, trialDaysLeft } from '@/lib/product';

export async function GET() {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, plan, trial_ends_at, stripe_customer_id, stripe_sub_id, subscription_status, current_period_end')
    .eq('id', session.companyId)
    .single();

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Count active employees and properties
  const [{ count: empCount }, { count: propCount }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', session.companyId).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', session.companyId),
  ]);

  const planKey  = (company.plan ?? 'trial') as keyof typeof PLANS;
  const plan     = PLANS[planKey] ?? PLANS.trial;
  const seats    = empCount ?? 0;
  const props    = propCount ?? 0;
  const daysLeft = trialDaysLeft(company.trial_ends_at);

  const estimatedMonthly = plan.pricePerSeat > 0 ? seats * plan.pricePerSeat : 0;

  return NextResponse.json({
    company: {
      id:                  company.id,
      name:                company.name,
      plan:                planKey,
      trial_ends_at:       company.trial_ends_at,
      stripe_customer_id:  company.stripe_customer_id,
      stripe_sub_id:       company.stripe_sub_id,
      subscription_status: company.subscription_status,
      current_period_end:  company.current_period_end,
    },
    usage: {
      activeEmployees:   seats,
      properties:        props,
      seatLimit:         plan.seatLimit,
      propertyLimit:     plan.propertyLimit,
      seatUsagePct:      plan.seatLimit ? Math.round((seats / plan.seatLimit) * 100) : 0,
      overSeatLimit:     plan.seatLimit ? seats > plan.seatLimit : false,
      estimatedMonthly,
    },
    trial: {
      daysLeft,
      isExpired: daysLeft === 0 && planKey === 'trial',
    },
    planConfig: plan,
  });
}
