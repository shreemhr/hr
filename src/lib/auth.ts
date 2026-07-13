import { redirect } from 'next/navigation';
import { getSession, SessionData } from './session';

export async function requireSession(): Promise<Required<SessionData>> {
  const session = await getSession();
  if (!session.userId || !session.companyId) redirect('/login');
  return session as Required<SessionData>;
}

export function isAdmin(role: string) {
  return role === 'owner' || role === 'vp_ops';
}

export function canManageProperty(session: SessionData, propertyId: string) {
  if (!session.role) return false;
  if (isAdmin(session.role)) return true;
  return (session.propertyIds ?? []).includes(propertyId);
}

// ROLE_LABELS moved to src/lib/constants.ts (client-safe)
