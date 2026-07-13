import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';
import { generateOfferLetterHTML, OfferLetterData } from '@/lib/offerLetter';
import JSZip from 'jszip';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  // Fetch employee with related data
  const { data: emp } = await supabase
    .from('employees')
    .select(`
      *,
      properties(id, name, state, city, address, brand),
      positions(id, title, department, pay_type)
    `)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch offer letter document if exists
  const { data: offerDoc } = await supabase
    .from('documents')
    .select('content')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .eq('type', 'offer_letter')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch onboarding tasks
  const { data: tasks } = await supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('created_at');

  // Fetch company name
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', session.companyId)
    .single();

  const fullName = `${emp.first_name} ${emp.last_name}`;
  const prop = emp.properties as unknown as { name: string; state: string; city: string; address: string; brand: string } | null;
  const pos = emp.positions as unknown as { title: string; department: string; pay_type: string } | null;

  const zip = new JSZip();
  const folder = zip.folder(`${emp.last_name}_${emp.first_name}_onboarding`)!;

  // 1. Employee info text file
  const infoLines = [
    `EMPLOYEE ONBOARDING PACKAGE`,
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    ``,
    `── EMPLOYEE ──────────────────────────────────`,
    `Name:             ${fullName}`,
    `Email:            ${emp.email ?? 'N/A'}`,
    `Phone:            ${emp.phone ?? 'N/A'}`,
    `Hire Date:        ${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-US') : 'N/A'}`,
    `Employment Type:  ${emp.employment_type?.replace('_', '-') ?? 'N/A'}`,
    `Pay Rate:         ${emp.pay_rate ? `$${emp.pay_rate}` : 'N/A'}`,
    ``,
    `── PROPERTY ──────────────────────────────────`,
    `Property:         ${prop?.name ?? 'N/A'}`,
    `Brand:            ${prop?.brand ?? 'N/A'}`,
    `Location:         ${prop?.city ?? ''} ${prop?.state ?? ''}`.trim(),
    ``,
    `── POSITION ──────────────────────────────────`,
    `Position:         ${pos?.title ?? 'N/A'}`,
    `Department:       ${pos?.department ?? 'N/A'}`,
    `Pay Type:         ${pos?.pay_type ?? 'N/A'}`,
  ];
  folder.file('employee_info.txt', infoLines.join('\n'));

  // 2. Offer letter HTML (if available)
  if (offerDoc?.content) {
    const letterHTML = generateOfferLetterHTML(offerDoc.content as OfferLetterData);
    folder.file('offer_letter.html', letterHTML);
  } else {
    folder.file('offer_letter.txt', 'No offer letter has been generated for this employee yet.\nVisit the Documents section in ShreemHR to create one.');
  }

  // 3. Onboarding checklist HTML
  const checklistRows = (tasks ?? []).map(t => {
    const statusIcon = t.status === 'collected' ? '✓' : t.status === 'na' ? '—' : '○';
    const statusLabel = t.status === 'collected' ? 'Collected' : t.status === 'na' ? 'N/A' : 'Pending';
    const rowBg = t.status === 'collected' ? '#e8f3ec' : t.status === 'na' ? '#faf8f4' : '#fbf1de';
    return `
      <tr style="background:${rowBg}">
        <td style="padding:10px 12px;font-weight:600;font-size:15px;width:32px">${statusIcon}</td>
        <td style="padding:10px 12px">
          <strong>${t.form_name}</strong>
          <div style="color:#6b6760;font-size:12px">${t.form_id?.toUpperCase() ?? ''}</div>
        </td>
        <td style="padding:10px 12px;color:#34313d">${statusLabel}</td>
        <td style="padding:10px 12px;color:#6b6760;font-size:12px">${t.collected_at ? new Date(t.collected_at).toLocaleDateString('en-US') : ''}</td>
        <td style="padding:10px 12px;color:#6b6760;font-size:12px">${t.notes ?? ''}</td>
      </tr>`;
  }).join('');

  const totalCount = (tasks ?? []).length;
  const doneCount = (tasks ?? []).filter(t => t.status === 'collected' || t.status === 'na').length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const checklistHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Onboarding Checklist — ${fullName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #111; margin: 40px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #6b6760; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #e9e4da; }
  th { background: #faf8f4; text-align: left; padding: 10px 12px; font-size: 12px; color: #34313d; border-bottom: 1px solid #e9e4da; }
  td { border-bottom: 1px solid #f4f2ee; vertical-align: top; }
  .progress { background: #e9e4da; border-radius: 4px; height: 8px; margin: 12px 0 4px; }
  .progress-bar { background: #4338ca; border-radius: 4px; height: 8px; width: ${pct}%; }
  .footer { margin-top: 32px; color: #a8a39a; font-size: 12px; }
</style>
</head>
<body>
<h1>Onboarding Checklist — ${fullName}</h1>
<div class="meta">
  ${prop?.name ?? ''} · Hired ${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-US') : 'N/A'} · 
  Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>
<div style="margin-bottom:20px">
  <strong>${doneCount} of ${totalCount} forms complete</strong>
  <div class="progress"><div class="progress-bar"></div></div>
  <div style="font-size:12px;color:#6b6760">${pct}% complete</div>
</div>
${totalCount > 0 ? `
<table>
  <thead>
    <tr>
      <th></th>
      <th>Form</th>
      <th>Status</th>
      <th>Date Collected</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>${checklistRows}</tbody>
</table>
` : '<p style="color:#6b6760">No onboarding tasks found. Start onboarding from the employee profile.</p>'}
<div class="footer">Generated by ${company?.name ?? 'ShreemHR'}</div>
</body>
</html>`;

  folder.file('onboarding_checklist.html', checklistHTML);

  const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
  const arrayBuffer = zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength);
  const safeName = `${emp.last_name}_${emp.first_name}`.replace(/[^a-zA-Z0-9_]/g, '');

  return new NextResponse(arrayBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_onboarding.zip"`,
    },
  });
}
