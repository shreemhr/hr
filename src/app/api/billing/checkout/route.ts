import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';
import { stripe, getOrCreateCustomer, getActiveEmployeeCount } from '@/lib/stripe';
import { PLANS, PRODUCT_DOMAIN } from '@/lib/product';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { plan } = body;

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig.priceId) {
    return NextResponse.json({ error: 'Plan not configured. Set STRIPE_PRICE_* env vars.' }, { status: 400 });
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, stripe_customer_id')
    .eq('id', session.companyId)
    .single();

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer({
    companyId:   session.companyId,
    companyName: company.name,
    email:       session.email!,
    existingId:  company.stripe_customer_id,
  });

  // Save customer ID if new
  if (customerId !== company.stripe_customer_id) {
    await supabase.from('companies').update({ stripe_customer_id: customerId }).eq('id', session.companyId);
  }

  // Get seat count for quantity-based pricing
  const seats = await getActiveEmployeeCount(session.companyId);
  const quantity = Math.max(seats, 1);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer:    customerId,
    mode:        'subscription',
    line_items: [{
      price:    planConfig.priceId,
      quantity,
    }],
    success_url: `${PRODUCT_DOMAIN}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${PRODUCT_DOMAIN}/billing/cancel`,
    metadata: {
      company_id: session.companyId,
      plan,
    },
    subscription_data: {
      metadata: {
        company_id: session.companyId,
        plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return NextResponse.json({ url: checkoutSession.url });
}
