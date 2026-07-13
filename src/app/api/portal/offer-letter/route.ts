import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePortalSession } from '@/lib/portal-session';
import { generateOfferLetterHTML, OfferLetterData } from '@/lib/offerLetter';

export async function GET(req: NextRequest) {
  const session = await requirePortalSession();
  const { searchParams } = new URL(req.url);
  const preview = searchParams.get('preview') === '1';

  // Get latest offer letter
  const { data: doc } = await supabase
    .from('documents')
    .select('id, content')
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .eq('type', 'offer_letter')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (preview) {
    if (!doc) {
      return new NextResponse('<html><body style="font-family:sans-serif;padding:40px;color:#a8a39a">No offer letter generated yet.</body></html>', {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    const html = generateOfferLetterHTML(doc.content as OfferLetterData);
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // Get acknowledgement
  const ackQuery = doc
    ? await supabase
        .from('document_acknowledgements')
        .select('acknowledged_at, signature_name')
        .eq('document_id', doc.id)
        .eq('employee_id', session.employeeId)
        .maybeSingle()
    : { data: null };

  return NextResponse.json({
    hasLetter:       !!doc,
    acknowledged:    !!ackQuery.data,
    acknowledged_at: ackQuery.data?.acknowledged_at ?? null,
    signature_name:  ackQuery.data?.signature_name ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await requirePortalSession();
  const { signature_name } = await req.json();

  if (!signature_name?.trim()) {
    return NextResponse.json({ error: 'Signature name required' }, { status: 400 });
  }

  // Get latest offer letter doc
  const { data: doc } = await supabase
    .from('documents')
    .select('id')
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .eq('type', 'offer_letter')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: 'No offer letter found' }, { status: 404 });
  }

  // Upsert acknowledgement
  await supabase
    .from('document_acknowledgements')
    .delete()
    .eq('document_id', doc.id)
    .eq('employee_id', session.employeeId);

  const acknowledgedAt = new Date().toISOString();

  const { error } = await supabase
    .from('document_acknowledgements')
    .insert({
      company_id:     session.companyId,
      document_id:    doc.id,
      employee_id:    session.employeeId,
      acknowledged_at: acknowledgedAt,
      signature_name: signature_name.trim(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, acknowledged_at: acknowledgedAt });
}
