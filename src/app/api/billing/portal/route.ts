import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { PRODUCT_DOMAIN } from '@/lib/product';

export async function GET() {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: company } = await supabase
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', session.companyId)
    .single();

  if (!company?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   company.stripe_customer_id,
    return_url: `${PRODUCT_DOMAIN}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
