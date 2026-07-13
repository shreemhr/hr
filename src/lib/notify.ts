// ──────────────────────────────────────────────────────────
// Notification Triggers
// Composable email events. Called from API routes.
// ──────────────────────────────────────────────────────────

import { sendEmail } from './email';
import { PRODUCT_NAME } from './product';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// ─── New hire alert to manager/HR ─────────────────────────
export async function notifyNewHire(params: {
  company_id:    string;
  to_email:      string;
  manager_name:  string;
  employee_name: string;
  property_name: string;
  position:      string;
  hire_date:     string;
  employee_id:   string;
}) {
  return sendEmail(
    {
      to:      params.to_email,
      subject: `New hire: ${params.employee_name} — ${params.property_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:20px">${PRODUCT_NAME}</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#6b6760;font-size:15px">Hi ${params.manager_name},</p>
            <p style="color:#1c1b22;font-size:15px">
              <strong>${params.employee_name}</strong> has been added as a new hire at <strong>${params.property_name}</strong>.
            </p>
            <table style="font-size:14px;color:#6b6760;width:100%;margin:16px 0">
              <tr><td style="padding:4px 0;color:#a8a39a">Position</td><td>${params.position}</td></tr>
              <tr><td style="padding:4px 0;color:#a8a39a">Hire date</td><td>${params.hire_date}</td></tr>
              <tr><td style="padding:4px 0;color:#a8a39a">Property</td><td>${params.property_name}</td></tr>
            </table>
            <a href="${APP_URL}/employees/${params.employee_id}/onboarding"
               style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
              Start onboarding →
            </a>
          </div>
        </div>
      `,
    },
    { company_id: params.company_id, type: 'new_hire', reference_id: params.employee_id, reference_type: 'employee' }
  );
}

// ─── Warning issued ───────────────────────────────────────
export async function notifyWarningIssued(params: {
  company_id:     string;
  to_email:       string;
  employee_name:  string;
  warning_type:   string;
  issued_date:    string;
  record_id:      string;
  employee_id:    string;
}) {
  return sendEmail(
    {
      to:      params.to_email,
      subject: `Disciplinary record issued: ${params.employee_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:20px">${PRODUCT_NAME}</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#6b6760;font-size:15px">A disciplinary record has been created.</p>
            <table style="font-size:14px;color:#6b6760;width:100%;margin:16px 0">
              <tr><td style="padding:4px 0;color:#a8a39a">Employee</td><td>${params.employee_name}</td></tr>
              <tr><td style="padding:4px 0;color:#a8a39a">Type</td><td>${params.warning_type}</td></tr>
              <tr><td style="padding:4px 0;color:#a8a39a">Date</td><td>${params.issued_date}</td></tr>
            </table>
            <a href="${APP_URL}/employees/${params.employee_id}"
               style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
              View employee record →
            </a>
          </div>
        </div>
      `,
    },
    { company_id: params.company_id, type: 'warning_issued', reference_id: params.record_id, reference_type: 'disciplinary_record' }
  );
}

// ─── Offboarding started ──────────────────────────────────
export async function notifyOffboardingStarted(params: {
  company_id:    string;
  to_email:      string;
  manager_name:  string;
  employee_name: string;
  last_day:      string | null;
  employee_id:   string;
}) {
  return sendEmail(
    {
      to:      params.to_email,
      subject: `Offboarding started: ${params.employee_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:20px">${PRODUCT_NAME}</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#6b6760;font-size:15px">Hi ${params.manager_name},</p>
            <p style="color:#1c1b22;font-size:15px">
              The offboarding process for <strong>${params.employee_name}</strong> has been initiated.
            </p>
            ${params.last_day ? `<p style="color:#6b6760;font-size:14px">Last day: <strong>${params.last_day}</strong></p>` : ''}
            <p style="color:#6b6760;font-size:14px">Please complete the offboarding checklist to ensure a smooth transition.</p>
            <a href="${APP_URL}/employees/${params.employee_id}/offboard"
               style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
              View offboarding checklist →
            </a>
          </div>
        </div>
      `,
    },
    { company_id: params.company_id, type: 'offboarding_started', reference_id: params.employee_id, reference_type: 'employee' }
  );
}

// ─── Onboarding overdue reminder ─────────────────────────
export async function notifyOnboardingOverdue(params: {
  company_id:    string;
  to_email:      string;
  employee_name: string;
  days_since:    number;
  pending_count: number;
  employee_id:   string;
}) {
  return sendEmail(
    {
      to:      params.to_email,
      subject: `Onboarding reminder: ${params.employee_name} has ${params.pending_count} pending forms`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:20px">${PRODUCT_NAME}</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#1c1b22;font-size:15px">
              <strong>${params.employee_name}</strong>'s onboarding has been in progress for ${params.days_since} days with ${params.pending_count} forms still pending.
            </p>
            <a href="${APP_URL}/employees/${params.employee_id}/onboarding"
               style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
              Complete onboarding →
            </a>
          </div>
        </div>
      `,
    },
    { company_id: params.company_id, type: 'onboarding_overdue', reference_id: params.employee_id, reference_type: 'employee' }
  );
}

// ─── Pay band: helper to resolve corporate (owner/vp_ops) emails ──
import { supabase } from './supabase';

async function getCorporateEmails(company_id: string): Promise<string[]> {
  const { data } = await supabase
    .from('users')
    .select('email, role')
    .eq('company_id', company_id)
    .in('role', ['owner', 'vp_ops']);
  return (data ?? []).map((u) => u.email).filter(Boolean);
}

function money(rate: number, payType: string): string {
  return payType === 'salary' ? `$${rate.toLocaleString()}/yr` : `$${rate.toFixed(2)}/hr`;
}

// ─── Pay band soft-flag (saved, but corporate notified) ───
export async function notifyPayBandSoftFlag(company_id: string, p: {
  employeeName: string; rate: number; min: number | null; max: number | null;
  positionTitle: string | null; payType: string; byName: string;
}) {
  const emails = await getCorporateEmails(company_id);
  if (!emails.length) return;
  const band = `${p.min != null ? money(p.min, p.payType) : '—'} – ${p.max != null ? money(p.max, p.payType) : '—'}`;
  return sendEmail(
    {
      to: emails,
      subject: `Pay outside band: ${p.employeeName} (${p.positionTitle ?? 'role'})`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#b5832e;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#1c1b22;margin:0;font-size:20px">${PRODUCT_NAME} · Compensation</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#1c1b22;font-size:15px">
              ${p.byName} set pay for <strong>${p.employeeName}</strong> at <strong>${money(p.rate, p.payType)}</strong>,
              which is outside the approved band (${band}) for ${p.positionTitle ?? 'this role'}.
            </p>
            <p style="color:#6b6760;font-size:14px">This position uses <strong>soft enforcement</strong>, so the pay was saved. No action is required — this is a notification for your records.</p>
            <a href="${APP_URL}/admin/compensation" style="display:inline-block;background:#1c1b22;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Review compensation →</a>
          </div>
        </div>`,
    },
    { company_id, type: 'pay_band_flag', reference_type: 'employee' }
  );
}

// ─── Pay exception requested (hard mode → needs approval) ───
export async function notifyPayExceptionRequested(company_id: string, p: {
  employeeName: string; rate: number; min: number | null; max: number | null;
  positionTitle: string | null; payType: string; byName: string; reason: string; exceptionId: string;
}) {
  const emails = await getCorporateEmails(company_id);
  if (!emails.length) return;
  const band = `${p.min != null ? money(p.min, p.payType) : '—'} – ${p.max != null ? money(p.max, p.payType) : '—'}`;
  return sendEmail(
    {
      to: emails,
      subject: `Approval needed: ${money(p.rate, p.payType)} for ${p.employeeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#b5832e;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#1c1b22;margin:0;font-size:20px">${PRODUCT_NAME} · Pay exception</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#1c1b22;font-size:15px">${p.byName} is requesting approval to pay <strong>${p.employeeName}</strong> (${p.positionTitle ?? 'role'}) at <strong>${money(p.rate, p.payType)}</strong>, above the approved band (${band}).</p>
            <div style="background:#fcfbf9;border-left:3px solid #b5832e;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;color:#6b6760;font-size:14px">${p.reason || '(no reason provided)'}</div>
            <a href="${APP_URL}/admin/compensation" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Review &amp; decide →</a>
          </div>
        </div>`,
    },
    { company_id, type: 'pay_exception_requested', reference_id: p.exceptionId, reference_type: 'pay_exception' }
  );
}

// ─── Pay exception decided (notify the requester) ───
export async function notifyPayExceptionDecided(company_id: string, p: {
  to_email: string; employeeName: string; rate: number; payType: string;
  outcome: 'approved' | 'denied'; deciderName: string; note: string;
}) {
  if (!p.to_email) return;
  const approved = p.outcome === 'approved';
  return sendEmail(
    {
      to: p.to_email,
      subject: `Pay exception ${approved ? 'approved' : 'denied'}: ${p.employeeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${approved ? '#16794a' : '#c0392b'};padding:24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:20px">${PRODUCT_NAME} · Pay exception</h2>
          </div>
          <div style="background:#fff;border:1px solid #e9e4da;border-top:none;border-radius:0 0 8px 8px;padding:28px">
            <p style="color:#1c1b22;font-size:15px">Your request to pay <strong>${p.employeeName}</strong> at <strong>${money(p.rate, p.payType)}</strong> was <strong>${approved ? 'approved' : 'denied'}</strong> by ${p.deciderName}.</p>
            ${p.note ? `<div style="background:#fcfbf9;border-left:3px solid ${approved ? '#16794a' : '#c0392b'};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;color:#6b6760;font-size:14px">${p.note}</div>` : ''}
            ${approved ? `<p style="color:#6b6760;font-size:14px">The pay rate has been applied to the employee record.</p>` : `<p style="color:#6b6760;font-size:14px">The pay rate was not changed. Reach out to corporate if you'd like to discuss.</p>`}
          </div>
        </div>`,
    },
    { company_id, type: 'pay_exception_decided', reference_type: 'pay_exception' }
  );
}
