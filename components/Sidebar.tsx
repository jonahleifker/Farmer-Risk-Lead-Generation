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
                <div className="sidebar-logo">🌱</div>
                <div>
                    <div className="sidebar-brand-title">Farmer Risk</div>
                    <div className="sidebar-brand-sub">Copilot</div>
                </div>
            </div>

            <div className="sidebar-divider" />

            {/* Navigation */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item.route);
                    return (
                        <Link
                            key={item.route}
                            href={item.route}
                            className={`sidebar-nav-item ${active ? 'active' : ''}`}
                        >
                            <span className="sidebar-nav-icon">{item.icon}</span>
                            <span className="sidebar-nav-label">{item.label}</span>
                            {active && <div className="sidebar-active-indicator" />}
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
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{session.user.name || session.user.email}</span>
                        </div>
                        <button className="sidebar-logout" onClick={() => signOut()}>
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <Link href="/login" className="sidebar-login-link">
                        Sign In →
                    </Link>
                )}
                <div className="sidebar-version">v1.0 MVP</div>
            </div>

            <style jsx>{`
        .sidebar {
          width: 240px;
          min-width: 240px;
          background: #111827;
          border-right: 1px solid #1f2937;
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
          padding: 0 20px 20px;
        }
        .sidebar-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .sidebar-brand-title {
          font-size: 16px;
          font-weight: 700;
          color: #f9fafb;
          letter-spacing: -0.3px;
        }
        .sidebar-brand-sub {
          font-size: 12px;
          font-weight: 500;
          color: #22c55e;
          letter-spacing: 0.5px;
        }
        .sidebar-divider {
          height: 1px;
          background: #1f2937;
          margin: 0 16px;
        }
        .sidebar-nav {
          flex: 1;
          padding: 12px 12px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          position: relative;
          text-decoration: none;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }
        .sidebar-nav-item:hover {
          background: rgba(34, 197, 94, 0.06);
          color: #d1d5db;
        }
        .sidebar-nav-item.active {
          background: rgba(34, 197, 94, 0.06);
          color: #f9fafb;
          font-weight: 600;
        }
        .sidebar-nav-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }
        .sidebar-active-indicator {
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 2px;
          background: #22c55e;
        }
        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-badges {
          display: flex;
          gap: 8px;
          padding: 12px 16px 0;
        }
        .sidebar-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #1f2937;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          color: #9ca3af;
        }
        .sidebar-user {
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-user-name {
          font-size: 12px;
          color: #d1d5db;
          font-weight: 500;
        }
        .sidebar-logout {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }
        .sidebar-logout:hover {
          color: #ef4444;
        }
        .sidebar-login-link {
          padding: 0 20px;
          color: #22c55e;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .sidebar-login-link:hover {
          text-decoration: underline;
        }
        .sidebar-version {
          font-size: 11px;
          color: #4b5563;
          padding: 0 20px;
        }
      `}</style>
        </aside>
    );
}
