import Stripe from 'stripe';
import { PLANS, PlanKey } from './product';

// Server-only Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2026-05-27.dahlia' as any,
});

// ── Seat quantity helpers ────────────────────────────────
// Returns the current active employee count for a company
export async function getActiveEmployeeCount(companyId: string): Promise<number> {
  const { supabase } = await import('./supabase');
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active');
  return count ?? 0;
}

// ── Subscription helpers ─────────────────────────────────
// Map Stripe price ID → plan key
export function planKeyFromPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if ('priceId' in plan && plan.priceId === priceId) return key as PlanKey;
  }
  return null;
}

// Create or retrieve Stripe Customer for a company
export async function getOrCreateCustomer(params: {
  companyId:   string;
  companyName: string;
  email:       string;
  existingId?: string | null;
}): Promise<string> {
  if (params.existingId) {
    try {
      const customer = await stripe.customers.retrieve(params.existingId);
      if (!customer.deleted) return params.existingId;
    } catch {}
  }
  const customer = await stripe.customers.create({
    name:     params.companyName,
    email:    params.email,
    metadata: { company_id: params.companyId },
  });
  return customer.id;
}

// Sync subscription quantity to match current active employee count
export async function syncSubscriptionSeats(subscriptionId: string, companyId: string): Promise<void> {
  try {
    const count   = await getActiveEmployeeCount(companyId);
    const sub     = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] });
    const itemId  = sub.items.data[0]?.id;
    if (!itemId) return;
    const quantity = Math.max(count, 1); // minimum 1 seat
    await stripe.subscriptionItems.update(itemId, { quantity });
  } catch (err) {
    console.error('Failed to sync subscription seats:', err);
  }
}
