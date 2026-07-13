'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Props {
  productName: string;
  isAdmin: boolean;
  pendingCount: number;
  pendingExceptions: number;
  planKey: string;
  planLabel?: string;
  daysLeft: number;
  overSeats: boolean;
  sessionName?: string;
  sessionEmail?: string;
  billingBanner?: React.ReactNode;
  children: React.ReactNode;
}

const COLLAPSE_KEY = 'shreemhr-sidebar-collapsed';

export default function AppShell(props: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed(c => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      return !c;
    });
  }

  const showBack = pathname !== '/dashboard';
  const sidebarWidth = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#faf8f4' }}>
      <aside
        style={{
          width: sidebarWidth, background: '#1c1b22', color: '#e9e4da',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          transition: mounted ? 'width 0.2s ease' : 'none',
        }}
      >
        <div style={{ padding: collapsed ? '18px 14px' : '22px 20px 16px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #34313d', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <span style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(150deg, #d9b160, #b5832e)',
            display: 'grid', placeItems: 'center',
            fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1c1b22', fontSize: 19,
            boxShadow: '0 2px 8px rgba(181,131,46,.35)', flexShrink: 0,
          }}>{props.productName.charAt(0)}</span>
          {!collapsed && (
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 19, color: '#fff', letterSpacing: '.2px', whiteSpace: 'nowrap' }}>
              {props.productName}
            </span>
          )}
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          <NavItem href="/dashboard" label="Dashboard" icon="⬜" collapsed={collapsed} />
          {props.isAdmin && <>
            <SectionLabel collapsed={collapsed}>Admin</SectionLabel>
            <NavItem href="/admin/properties" label="Properties"  icon="🏨" collapsed={collapsed} />
            <NavItem href="/admin/positions"  label="Positions"   icon="💼" collapsed={collapsed} />
            <NavItem href="/admin/compensation" label="Compensation" icon="💵" badge={props.pendingExceptions > 0 ? props.pendingExceptions : undefined} badgeBrass collapsed={collapsed} />
            <NavItem href="/admin/users"      label="Users"       icon="🔑" collapsed={collapsed} />
            <NavItem href="/admin/checklists" label="Checklists"  icon="✅" collapsed={collapsed} />
          </>}
          <SectionLabel collapsed={collapsed}>HR</SectionLabel>
          <NavItem href="/employees"  label="Employees"  icon="☺" collapsed={collapsed} />
          <NavItem href="/onboarding" label="Check-in" icon="🔔" badge={props.pendingCount > 0 ? props.pendingCount : undefined} collapsed={collapsed} />
          <NavItem href="/documents"  label="Documents"  icon="📄" collapsed={collapsed} />
          <SectionLabel collapsed={collapsed}>Reports</SectionLabel>
          <NavItem href="/reports/hiring"      label="Hiring Needs" icon="🎯" collapsed={collapsed} />
          <NavItem href="/reports/turnover"    label="Turnover"     icon="📉" collapsed={collapsed} />
          <NavItem href="/reports/recognition" label="Recognition"  icon="⭐" collapsed={collapsed} />
        </nav>

        {props.isAdmin && !collapsed && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #34313d' }}>
            <Link href="/billing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: '#6b6760' }}>
                {props.planKey === 'trial' ? `Trial · ${props.daysLeft}d left` : props.planLabel}
              </span>
              <span style={{ fontSize: 10, background: props.overSeats ? '#c0392b' : props.planKey === 'trial' ? '#c2780c' : '#16794a', color: '#fff', borderRadius: 999, padding: '2px 7px', fontWeight: 700 }}>
                {props.overSeats ? 'Over limit' : props.planKey === 'trial' ? 'Upgrade' : 'Active'}
              </span>
            </Link>
          </div>
        )}

        {!collapsed && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #34313d' }}>
            <div style={{ fontSize: 12, color: '#6b6760', marginBottom: 4 }}>{props.sessionName}</div>
            <div style={{ fontSize: 11, color: '#34313d', marginBottom: 10 }}>{props.sessionEmail}</div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{ background: 'transparent', color: '#6b6760', fontSize: 12, padding: '4px 0', border: 'none', cursor: 'pointer' }}>
                Sign out
              </button>
            </form>
          </div>
        )}

        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: '#2a2833', color: '#a8a39a', border: 'none', borderTop: '1px solid #34313d',
            padding: '10px 0', fontSize: 13, borderRadius: 0, width: '100%',
          }}
        >
          {collapsed ? '»' : '« Collapse'}
        </button>
      </aside>

      <main className="app-main-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {props.billingBanner}
        {showBack && (
          <div className="app-content" style={{ padding: '20px 32px 0' }}>
            <button
              onClick={() => router.back()}
              className="hover-lift"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4,
                background: 'transparent', color: '#6b6760', fontSize: 13, fontWeight: 600,
                padding: '6px 10px 6px 4px', borderRadius: 6,
              }}
            >
              ← Back
            </button>
          </div>
        )}
        <div className="app-content">
          {props.children}
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  if (collapsed) return <div style={{ height: 1, background: '#34313d', margin: '10px 14px' }} />;
  return (
    <div style={{ padding: '14px 20px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6b6760', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );
}

function NavItem({ href, label, icon, badge, badgeBrass, collapsed }: { href: string; label: string; icon: string; badge?: number; badgeBrass?: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '10px 0' : '9px 20px', color: '#a8a39a', fontSize: 14, textDecoration: 'none', transition: 'background 0.1s',
        position: 'relative',
      }}
      className="nav-item"
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        {!collapsed && label}
      </span>
      {badge != null && badge > 0 && (
        <span style={{
          background: badgeBrass ? '#b5832e' : '#c0392b', color: badgeBrass ? '#1c1b22' : '#fff',
          borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
          ...(collapsed ? { position: 'absolute', top: 4, right: 8 } : {}),
        }}>
          {badge}
        </span>
      )}
    </Link>
  );
}
