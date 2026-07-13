'use client';
import { useState, useEffect } from 'react';
import { PLANS, PRODUCT_NAME } from '@/lib/product';

interface BillingStatus {
  company: { plan: string; trial_ends_at: string | null; stripe_sub_id: string | null; subscription_status: string | null; current_period_end: string | null; };
  usage:   { activeEmployees: number; properties: number; seatLimit: number | null; propertyLimit: number | null; seatUsagePct: number; overSeatLimit: boolean; estimatedMonthly: number; };
  trial:   { daysLeft: number; isExpired: boolean; };
}

const PLAN_KEYS = ['starter', 'growth', 'enterprise'] as const;

export default function BillingPage() {
  const [status,    setStatus]    = useState<BillingStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [porting,   setPorting]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    fetch('/api/billing/status').then(r => r.json()).then(d => { setStatus(d); setLoading(false); });
  }, []);

  async function startCheckout(plan: string) {
    setUpgrading(plan); setError('');
    const res  = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to start checkout.'); setUpgrading(null); return; }
    window.location.href = data.url;
  }

  async function openPortal() {
    setPorting(true); setError('');
    const res  = await fetch('/api/billing/portal');
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to open billing portal.'); setPorting(false); return; }
    window.location.href = data.url;
  }

  const s = {
    h1:    { fontSize: 26, fontWeight: 800, color: '#1c1b22', margin: '0 0 6px' },
    sub:   { color: '#6b6760', fontSize: 15, marginBottom: 36 },
    grid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 40 },
    card:  (active: boolean, featured: boolean) => ({
      background: '#fff', border: `${featured ? 2 : 1}px solid ${featured ? '#4f46e5' : active ? '#16794a' : '#e9e4da'}`,
      borderRadius: 12, padding: 26, position: 'relative' as const,
    }),
    planName: { fontSize: 18, fontWeight: 800, color: '#1c1b22', marginBottom: 4 },
    planDesc: { fontSize: 13, color: '#6b6760', marginBottom: 20 },
    price:    { fontSize: 32, fontWeight: 800, color: '#1c1b22', lineHeight: 1 },
    priceSub: { fontSize: 12, color: '#6b6760', marginTop: 4, marginBottom: 20 },
    feats:    { fontSize: 13, color: '#6b6760', marginBottom: 24, lineHeight: 1.8 },
    btn:   (active: boolean, featured: boolean) => ({
      width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
      background: active ? '#e8f3ec' : featured ? '#4f46e5' : '#f4f2ee',
      color:      active ? '#16794a' : featured ? '#fff' : '#1c1b22',
    }),
    tag:   { position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap' as const },
    usage: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 24, marginBottom: 20 },
    uHead: { fontWeight: 700, fontSize: 16, color: '#1c1b22', marginBottom: 18 },
    uGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 },
    uCard: { background: '#faf8f4', borderRadius: 8, padding: 16 },
    uLbl:  { fontSize: 11, fontWeight: 700, color: '#a8a39a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 },
    uBig:  { fontSize: 24, fontWeight: 800, color: '#1c1b22' },
    uSub:  { fontSize: 12, color: '#6b6760', marginTop: 2 },
    bar:   { height: 8, borderRadius: 999, background: '#e9e4da', overflow: 'hidden', marginTop: 12, marginBottom: 4 },
    err:   { background: '#fae9e7', color: '#c0392b', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20 },
  } as const;

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;
  if (!status) return <div style={{ color: '#c0392b' }}>Unable to load billing info.</div>;

  const { company, usage, trial } = status;
  const currentPlan = company.plan as keyof typeof PLANS;
  const hasSub = !!company.stripe_sub_id && company.subscription_status !== 'canceled';

  return (
    <div>
      <h1 style={s.h1}>Plans & Billing</h1>
      <p style={s.sub}>
        {currentPlan === 'trial'
          ? trial.isExpired
            ? '⚠ Your trial has expired. Upgrade to continue using ShreemHR.'
            : `You're on a free trial — ${trial.daysLeft} day${trial.daysLeft !== 1 ? 's' : ''} remaining.`
          : `Current plan: ${PLANS[currentPlan]?.label ?? currentPlan}`
        }
      </p>

      {error && <div style={s.err}>{error}</div>}

      {/* Usage */}
      <div style={s.usage}>
        <div style={s.uHead}>Current Usage</div>
        <div style={s.uGrid}>
          <div style={s.uCard}>
            <div style={s.uLbl}>Active Employees</div>
            <div style={s.uBig}>{usage.activeEmployees}</div>
            <div style={s.uSub}>{usage.seatLimit ? `of ${usage.seatLimit} included` : 'unlimited'}</div>
          </div>
          <div style={s.uCard}>
            <div style={s.uLbl}>Properties</div>
            <div style={s.uBig}>{usage.properties}</div>
            <div style={s.uSub}>{usage.propertyLimit ? `of ${usage.propertyLimit} allowed` : 'unlimited'}</div>
          </div>
          <div style={s.uCard}>
            <div style={s.uLbl}>Est. Monthly Cost</div>
            <div style={s.uBig}>${usage.estimatedMonthly}</div>
            <div style={s.uSub}>
              {PLANS[currentPlan]?.pricePerSeat > 0
                ? `${usage.activeEmployees} seats × $${PLANS[currentPlan].pricePerSeat}/mo`
                : currentPlan === 'trial' ? 'free trial' : 'included'}
            </div>
          </div>
        </div>
        {usage.seatLimit && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: usage.overSeatLimit ? '#c0392b' : '#6b6760', marginBottom: 4 }}>
              <span>Seat usage</span>
              <span style={{ fontWeight: 600 }}>{usage.seatUsagePct}%{usage.overSeatLimit ? ' — over limit' : ''}</span>
            </div>
            <div style={s.bar}>
              <div style={{ height: '100%', width: `${Math.min(usage.seatUsagePct, 100)}%`, background: usage.overSeatLimit ? '#c0392b' : usage.seatUsagePct > 80 ? '#c2780c' : '#4f46e5', borderRadius: 999 }} />
            </div>
          </>
        )}
        {hasSub && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f4f2ee' }}>
            <div style={{ fontSize: 13, color: '#6b6760' }}>
              {company.current_period_end
                ? `Next billing: ${new Date(company.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Subscription active'}
              {company.subscription_status === 'past_due' && <span style={{ color: '#c0392b', fontWeight: 700, marginLeft: 8 }}>· Payment past due</span>}
            </div>
            <button onClick={openPortal} disabled={porting} style={{ background: '#f4f2ee', color: '#1c1b22', fontWeight: 600, padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              {porting ? 'Opening…' : 'Manage Subscription →'}
            </button>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b22', marginBottom: 20 }}>
        {hasSub ? 'Change Plan' : 'Choose a Plan'}
      </h2>
      <div style={s.grid}>
        {PLAN_KEYS.map(key => {
          const plan    = PLANS[key];
          const isActive = currentPlan === key;
          const featured = key === 'growth';
          return (
            <div key={key} style={s.card(isActive, featured)}>
              {featured && <div style={s.tag}>Most Popular</div>}
              {isActive && <div style={{ ...s.tag, background: '#16794a' }}>Current Plan</div>}
              <div style={s.planName}>{plan.label}</div>
              <div style={s.planDesc}>{plan.description}</div>
              <div style={s.price}>${plan.pricePerSeat}</div>
              <div style={s.priceSub}>per employee / month</div>
              <div style={s.feats}>
                {plan.seatLimit ? `✓ Up to ${plan.seatLimit} employees` : '✓ Unlimited employees'}<br />
                {plan.propertyLimit ? `✓ Up to ${plan.propertyLimit} properties` : '✓ Unlimited properties'}<br />
                ✓ All HR features included<br />
                ✓ Employee portal<br />
                ✓ Onboarding & documents<br />
                {key !== 'starter' && <>✓ Priority support<br /></>}
                {key === 'enterprise' && <>✓ Dedicated account manager<br /></>}
              </div>
              <button
                style={s.btn(isActive, featured)}
                disabled={isActive || !!upgrading}
                onClick={() => !isActive && startCheckout(key)}
              >
                {upgrading === key
                  ? 'Redirecting to Stripe…'
                  : isActive
                    ? 'Current Plan'
                    : hasSub
                      ? `Switch to ${plan.label}`
                      : `Upgrade to ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' as const, color: '#a8a39a', fontSize: 13 }}>
        All plans billed monthly per active employee · Cancel anytime · Powered by Stripe
      </div>
    </div>
  );
}
