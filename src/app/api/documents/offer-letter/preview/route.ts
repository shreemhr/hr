import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { generateOfferLetterHTML, OfferLetterData } from '@/lib/offerLetter';

export async function POST(req: NextRequest) {
  await requireSession(); // just auth check

  const body = await req.json();
  const data = body as OfferLetterData;

  if (!data.employeeFirst || !data.employeeLast) {
    return NextResponse.json({ error: 'employeeFirst and employeeLast required' }, { status: 400 });
  }

  const html = generateOfferLetterHTML(data);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
