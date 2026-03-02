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

      <style jsx>{`
        .sidebar {
          width: 250px;
          min-width: 250px;
          background: rgba(11, 17, 32, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-right: 1px solid rgba(148, 163, 184, 0.06);
          padding-top: 24px;
          padding-bottom: 16px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 22px 22px;
        }
        .sidebar-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-logo:hover {
          background: rgba(34, 197, 94, 0.12);
          box-shadow: 0 0 16px rgba(34, 197, 94, 0.1);
          transform: scale(1.05);
        }
        .sidebar-logo-emoji {
          font-size: 20px;
        }
        .sidebar-brand-title {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.3px;
        }
        .sidebar-brand-sub {
          font-size: 11px;
          font-weight: 600;
          color: #22c55e;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .sidebar-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.08), transparent);
          margin: 0 18px;
        }
        .sidebar-nav {
          flex: 1;
          padding: 24px 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          position: relative;
          text-decoration: none;
          color: #94a3b8;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border: 1px solid transparent;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          animation: sidebarFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes sidebarFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .sidebar-nav-item:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.06), rgba(59, 130, 246, 0.04));
          color: #e2e8f0;
          border-color: rgba(148, 163, 184, 0.08);
          transform: translateX(3px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }
        .sidebar-nav-item.active {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.04));
          color: #f1f5f9;
          font-weight: 700;
          border-color: rgba(34, 197, 94, 0.15);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.08), inset 0 0 0 1px rgba(34, 197, 94, 0.06);
        }
        .sidebar-nav-icon {
          font-size: 20px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(148, 163, 184, 0.04);
          border-radius: 8px;
          flex-shrink: 0;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-nav-item:hover .sidebar-nav-icon {
          background: rgba(34, 197, 94, 0.08);
          transform: scale(1.1);
        }
        .sidebar-nav-item.active .sidebar-nav-icon {
          background: rgba(34, 197, 94, 0.12);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.15);
        }
        .sidebar-nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-active-indicator {
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3.5px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #22c55e, #16a34a);
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.5), 0 0 4px rgba(34, 197, 94, 0.3);
        }
        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-badges {
          display: flex;
          gap: 6px;
          padding: 12px 18px 0;
        }
        .sidebar-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.06);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        .sidebar-user {
          padding: 0 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #22c55e;
          flex-shrink: 0;
        }
        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .sidebar-user-name {
          font-size: 12px;
          color: #cbd5e1;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-logout {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 11px;
          cursor: pointer;
          text-align: left;
          padding: 0;
          transition: color 0.2s;
        }
        .sidebar-logout:hover {
          color: #ef4444;
        }
        .sidebar-login-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 18px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.12);
          color: #22c55e;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-login-btn:hover {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.25);
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.08);
        }
        .sidebar-login-arrow {
          transition: transform 0.2s;
        }
        .sidebar-login-btn:hover .sidebar-login-arrow {
          transform: translateX(3px);
        }
        .sidebar-version {
          font-size: 10px;
          color: #334155;
          padding: 0 22px;
          letter-spacing: 0.5px;
        }
      `}</style>
    </aside>
  );
}
