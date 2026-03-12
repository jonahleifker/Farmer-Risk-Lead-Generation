'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Farm Economics', icon: '🌾', route: '/dashboard' },
  { label: 'Market Opportunity', icon: '📈', route: '/dashboard/market' },
  { label: 'Fundamentals', icon: '🌍', route: '/dashboard/fundamentals' },
  { label: 'Strategy Builder', icon: '💡', route: '/dashboard/strategies' },
  { label: 'Trade Products', icon: '🏷️', route: '/dashboard/trade-products' },
  { label: 'History', icon: '📋', route: '/dashboard/history' },
  { label: 'Positions', icon: '🛡️', route: '/dashboard/positions' },
  { label: 'Executive Summary', icon: '📊', route: '/dashboard/reports' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (route: string) => {
    if (route === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(route);
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="sidebar-logo-emoji">🌱</span>
        </div>
        <div>
          <div className="sidebar-brand-title">Farmer Risk</div>
          <div className="sidebar-brand-sub">Copilot</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.route);
          return (
            <Link
              key={item.route}
              href={item.route}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {active && <div className="sidebar-active-indicator" />}
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <div className="sidebar-badges">
          <span className="sidebar-badge">🌽 Corn</span>
          <span className="sidebar-badge">🫘 Soybeans</span>
        </div>
        {session?.user ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(session.user.name || session.user.email || '?')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{session.user.name || session.user.email}</span>
              <button className="sidebar-logout" onClick={() => signOut()}>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login" className="sidebar-login-btn">
            <span>Sign In</span>
            <span className="sidebar-login-arrow">→</span>
          </Link>
        )}
        <div className="sidebar-version">v1.0 MVP</div>
      </div>

    </aside>
  );
}
