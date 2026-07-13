import { redirect } from 'next/navigation';
import { requireSession, isAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isAdmin(session.role)) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
