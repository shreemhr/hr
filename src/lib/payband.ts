import { supabase } from '@/lib/supabase';

export type BandMode = 'hard' | 'soft';

export interface BandCheck {
  /** true if the rate is within band, or no band is set, or no rate given */
  ok: boolean;
  /** 'over' | 'under' | null */
  breach: 'over' | 'under' | null;
  mode: BandMode;
  min: number | null;
  max: number | null;
  rate: number | null;
  positionTitle: string | null;
  payType: string;
}

/**
 * Look up the approved band for a position and evaluate a proposed pay rate.
 * Used server-side on every employee create/update so the rule cannot be
 * bypassed from the client. Never trusts band values sent by the client.
 */
export async function checkPayAgainstBand(
  companyId: string,
  positionId: string | null | undefined,
  rate: number | null | undefined,
): Promise<BandCheck> {
  const base: BandCheck = {
    ok: true, breach: null, mode: 'hard',
    min: null, max: null, rate: rate ?? null,
    positionTitle: null, payType: 'hourly',
  };

  if (!positionId || rate == null || Number.isNaN(Number(rate))) return base;

  const { data: pos } = await supabase
    .from('positions')
    .select('title, pay_type, pay_band_min, pay_band_max, pay_band_mode')
    .eq('id', positionId)
    .eq('company_id', companyId)
    .single();

  if (!pos) return base;

  const min = pos.pay_band_min != null ? Number(pos.pay_band_min) : null;
  const max = pos.pay_band_max != null ? Number(pos.pay_band_max) : null;
  const mode = (pos.pay_band_mode ?? 'hard') as BandMode;
  const r = Number(rate);

  let breach: 'over' | 'under' | null = null;
  if (max != null && r > max) breach = 'over';
  else if (min != null && r < min) breach = 'under';

  return {
    ok: breach === null,
    breach,
    mode,
    min, max, rate: r,
    positionTitle: pos.title ?? null,
    payType: pos.pay_type ?? 'hourly',
  };
}

export function formatRate(rate: number, payType: string): string {
  return payType === 'salary'
    ? `$${rate.toLocaleString()}/yr`
    : `$${rate.toFixed(2)}/hr`;
}
