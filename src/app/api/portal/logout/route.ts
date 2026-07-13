import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-session';

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  session.destroy();
  return NextResponse.redirect(new URL('/portal', req.url));
}
