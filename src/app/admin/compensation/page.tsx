import { redirect } from 'next/navigation';
import { requireSession, isAdmin } from '@/lib/auth';
import CompensationClient from './CompensationClient';

export default async function CompensationPage() {
  const session = await requireSession();
  if (!isAdmin(session.role)) {
    redirect('/dashboard');
  }
  return <CompensationClient />;
}
