// ──────────────────────────────────────────────────────────
// Email Utility
// Sends via Resend (resend.com) when RESEND_API_KEY is set.
// Falls back to console logging in dev — no setup required.
// ──────────────────────────────────────────────────────────

import { supabase } from './supabase';

export interface EmailPayload {
  to:       string | string[];
  subject:  string;
  html:     string;
  from?:    string;
}

export async function sendEmail(
  payload: EmailPayload,
  meta?: { company_id: string; type: string; reference_id?: string; reference_type?: string }
): Promise<boolean> {
  const from    = payload.from ?? `ShreemHR <noreply@${process.env.RESEND_FROM_DOMAIN ?? 'mail.shreemhr.com'}>`;
  const apiKey  = process.env.RESEND_API_KEY;

  let sent  = false;
  let error: string | null = null;

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html }),
      });
      sent  = res.ok;
      if (!res.ok) error = await res.text();
    } catch (err) {
      error = String(err);
    }
  } else {
    // Dev fallback: print to console
    console.log(`\n[EMAIL] To: ${payload.to}\n[EMAIL] Subject: ${payload.subject}\n[EMAIL] (Set RESEND_API_KEY to send for real)\n`);
    sent = true;
  }

  // Always log to DB
  if (meta?.company_id) {
    await supabase.from('notification_log').insert({
      company_id:     meta.company_id,
      type:           meta.type,
      to_email:       Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject:        payload.subject,
      sent,
      sent_at:        sent ? new Date().toISOString() : null,
      error,
      reference_id:   meta.reference_id   ?? null,
      reference_type: meta.reference_type ?? null,
    });
  }

  return sent;
}
