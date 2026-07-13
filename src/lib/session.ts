import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?:     string;
  companyId?:  string;
  role?:       'owner' | 'vp_ops' | 'gm' | 'hr';
  propertyIds?: string[];   // for GM/HR scope
  email?:      string;
  name?:       string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-32-chars-minimum!!',
  cookieName: 'stayhr-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
