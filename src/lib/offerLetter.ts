// ──────────────────────────────────────────────────────────
// OFFER LETTER GENERATOR
// Generates clean HTML that renders beautifully in browser
// and prints directly to PDF via the browser's print dialog.
// No PDF library required — keeps the stack lean.
// ──────────────────────────────────────────────────────────

export interface OfferLetterData {
  companyName:   string;
  propertyName:  string;
  employeeFirst: string;
  employeeLast:  string;
  positionTitle: string;
  startDate:     string;     // e.g. "July 7, 2026"
  payRate:       string;     // e.g. "18.50"
  payType:       'hourly' | 'salary';
  employmentType?: string;   // "Full-time" | "Part-time"
  signerName:    string;
  signerTitle:   string;
  offerDate:     string;     // e.g. "June 18, 2026"
  acceptBy?:     string;     // deadline to accept
  notes?:        string;     // custom paragraph
}

function fmtPay(rate: string, type: 'hourly' | 'salary'): string {
  const n = parseFloat(rate);
  if (isNaN(n)) return rate;
  if (type === 'hourly') return `$${n.toFixed(2)} per hour`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })} per year`;
}

export function generateOfferLetterHTML(d: OfferLetterData): string {
  const payStr = fmtPay(d.payRate, d.payType);
  const empType = d.employmentType ?? (d.payType === 'hourly' ? 'Hourly' : 'Salaried');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Offer Letter — ${d.employeeFirst} ${d.employeeLast}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1a1a1a;
    background: #fff;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 48px 64px;
  }
  .letterhead {
    border-bottom: 2px solid #1c1b22;
    padding-bottom: 18px;
    margin-bottom: 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .letterhead-company { font-size: 15pt; font-weight: bold; color: #1c1b22; }
  .letterhead-property { font-size: 10pt; color: #475569; margin-top: 2px; }
  .letterhead-date { font-size: 10pt; color: #475569; text-align: right; }
  .salutation { margin-bottom: 18px; }
  .body-section { margin-bottom: 16px; }
  .summary-box {
    background: #f8fafc;
    border: 1px solid #e9e4da;
    border-radius: 4px;
    padding: 16px 20px;
    margin: 20px 0;
  }
  .summary-row {
    display: flex;
    padding: 4px 0;
    border-bottom: 1px solid #e9e4da;
    font-size: 10.5pt;
  }
  .summary-row:last-child { border-bottom: none; }
  .summary-label { width: 160px; color: #6b6760; font-style: italic; flex-shrink: 0; }
  .summary-value { font-weight: bold; color: #1c1b22; }
  .signature-section { margin-top: 40px; }
  .signature-block { margin-top: 20px; }
  .sig-line {
    display: flex;
    gap: 48px;
    margin-top: 32px;
  }
  .sig-item { flex: 1; }
  .sig-underline {
    border-bottom: 1px solid #1c1b22;
    margin-bottom: 4px;
    height: 32px;
  }
  .sig-label { font-size: 9pt; color: #6b6760; }
  @media print {
    body { padding: 32px 40px 48px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="letterhead">
    <div>
      <div class="letterhead-company">${escHtml(d.companyName)}</div>
      <div class="letterhead-property">${escHtml(d.propertyName)}</div>
    </div>
    <div class="letterhead-date">${escHtml(d.offerDate)}</div>
  </div>

  <p class="salutation">Dear ${escHtml(d.employeeFirst)},</p>

  <p class="body-section">
    We are pleased to offer you employment with <strong>${escHtml(d.companyName)}</strong> at
    <strong>${escHtml(d.propertyName)}</strong>. We believe your skills and background will be a
    valuable addition to our team.
  </p>

  <div class="summary-box">
    <div class="summary-row">
      <span class="summary-label">Position</span>
      <span class="summary-value">${escHtml(d.positionTitle)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Location</span>
      <span class="summary-value">${escHtml(d.propertyName)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Start Date</span>
      <span class="summary-value">${escHtml(d.startDate)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Compensation</span>
      <span class="summary-value">${escHtml(payStr)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Employment Type</span>
      <span class="summary-value">${escHtml(empType)}</span>
    </div>
  </div>

  <p class="body-section">
    Please report to <strong>${escHtml(d.propertyName)}</strong> on your start date.
    A member of our team will coordinate specific arrival details with you prior to your first day.
  </p>

  <p class="body-section">
    This offer is contingent upon the successful completion of standard onboarding requirements,
    including verification of your eligibility to work in the United States (Form I-9) and any
    applicable federal or state withholding documentation.
  </p>

  ${d.notes ? `<p class="body-section">${escHtml(d.notes)}</p>` : ''}

  ${d.acceptBy ? `<p class="body-section">To confirm your acceptance of this offer, please sign and return a copy of this letter by <strong>${escHtml(d.acceptBy)}</strong>.</p>` : ''}

  <p class="body-section">
    We look forward to welcoming you to the team. If you have any questions prior to your start date,
    please do not hesitate to reach out.
  </p>

  <p class="body-section">Sincerely,</p>

  <div class="signature-block">
    <strong>${escHtml(d.signerName)}</strong><br/>
    <span style="color:#6b6760;">${escHtml(d.signerTitle)}</span><br/>
    <span style="color:#6b6760;">${escHtml(d.companyName)}</span>
  </div>

  <div class="sig-line" style="margin-top:48px;">
    <div class="sig-item">
      <div class="sig-underline"></div>
      <div class="sig-label">Employee Signature</div>
    </div>
    <div class="sig-item">
      <div class="sig-underline"></div>
      <div class="sig-label">Date</div>
    </div>
  </div>

  <div style="margin-top:8px;font-size:9pt;color:#6b6760;">
    ${escHtml(d.employeeFirst)} ${escHtml(d.employeeLast)}
  </div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
