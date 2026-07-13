import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface PortalSessionData {
  employeeId?:   string;
  companyId?:    string;
  employeeName?: string;
}

export const portalSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-32-chars-minimum!!',
  cookieName: 'stayhr-portal',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getPortalSession() {
  return getIronSession<PortalSessionData>(cookies(), portalSessionOptions);
}

export async function requirePortalSession(): Promise<Required<PortalSessionData>> {
  const session = await getPortalSession();
  if (!session.employeeId || !session.companyId) {
    const { redirect } = await import('next/navigation');
    redirect('/portal');
  }
  return session as Required<PortalSessionData>;
}
