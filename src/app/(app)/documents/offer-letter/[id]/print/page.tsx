import { supabase } from '@/lib/supabase';
import { requireSession } from '@/lib/auth';
import { generateOfferLetterHTML, OfferLetterData } from '@/lib/offerLetter';
import { notFound } from 'next/navigation';

export default async function PrintOfferLetterPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireSession();

  // params.id is the employee_id (consistent with the editor route and its API) — fetch that
  // employee's most recently saved offer letter, not a document row keyed by this id directly.
  const { data: doc } = await supabase
    .from('documents')
    .select('*, employees(first_name, last_name)')
    .eq('employee_id', params.id)
    .eq('type', 'offer_letter')
    .eq('company_id', session.companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!doc) notFound();

  const fields = doc.content as OfferLetterData;
  const html = generateOfferLetterHTML(fields);

  // Return raw HTML that auto-prints
  return (
    <html>
      <head>
        <title>Offer Letter — {fields.employeeFirst} {fields.employeeLast}</title>
        <style>{`
          @media print {
            @page { margin: 1in; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          body {
            font-family: Georgia, serif;
            background: #fff;
            color: #111;
            margin: 0;
            padding: 0;
          }
          .print-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #4338ca;
            color: #fff;
            padding: 10px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 999;
            font-family: system-ui, sans-serif;
          }
          .print-bar button {
            background: #fff;
            color: #4338ca;
            border: none;
            padding: 6px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
          }
          .print-bar a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            font-size: 14px;
          }
          .print-bar a:hover { color: #fff; }
          .letter-wrap {
            margin-top: 56px;
            padding: 48px;
            max-width: 860px;
            margin-left: auto;
            margin-right: auto;
          }
        `}</style>
      </head>
      <body>
        <div className="print-bar no-print">
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            Offer Letter — {fields.employeeFirst} {fields.employeeLast}
          </span>
          <button id="print-btn">🖨 Print / Save PDF</button>
          <a href={`/documents/offer-letter/${params.id}`}>← Back to editor</a>
        </div>
        <div
          className="letter-wrap"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Server Components can't attach event handlers — wire the print button via a plain script instead. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('print-btn').addEventListener('click', () => window.print());`,
          }}
        />
      </body>
    </html>
  );
}
