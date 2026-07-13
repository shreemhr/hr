import { NextRequest, NextResponse } from 'next/server';
import { stripe, planKeyFromPriceId } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

// Must use raw body for Stripe signature verification
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        const companyId = session.metadata?.company_id;
        const plan      = session.metadata?.plan;
        const subId     = session.subscription as string;
        if (!companyId || !plan || !subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        await supabase.from('companies').update({
          plan,
          stripe_sub_id:       subId,
          subscription_status: sub.status,
          current_period_end:  new Date((sub as any).current_period_end * 1000).toISOString(),
        }).eq('id', companyId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub       = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan    = priceId ? (planKeyFromPriceId(priceId) ?? undefined) : undefined;

        const updates: Record<string, unknown> = {
          subscription_status: sub.status,
          current_period_end:  new Date((sub as any).current_period_end * 1000).toISOString(),
        };
        if (plan) updates.plan = plan;

        await supabase.from('companies').update(updates).eq('id', companyId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub       = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase.from('companies').update({
          plan:                'trial',
          subscription_status: 'canceled',
          stripe_sub_id:       null,
        }).eq('id', companyId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice   = event.data.object as any;
        const subId     = invoice.subscription as string;
        if (!subId) break;

        const sub       = await stripe.subscriptions.retrieve(subId);
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase.from('companies').update({
          subscription_status: 'past_due',
        }).eq('id', companyId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice   = event.data.object as any;
        const subId     = invoice.subscription as string;
        if (!subId) break;

        const sub       = await stripe.subscriptions.retrieve(subId);
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase.from('companies').update({
          subscription_status: 'active',
          current_period_end:  new Date((sub as any).current_period_end * 1000).toISOString(),
        }).eq('id', companyId);
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
