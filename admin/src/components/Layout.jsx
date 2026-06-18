import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

const NAV_GROUPS = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    section: 'People',
    items: [
      { to: '/users', icon: '👥', label: 'Fishermen' },
      { to: '/officers', icon: '🎖️', label: 'Officers' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/sos', icon: '🆘', label: 'SOS Alerts' },
      { to: '/incidents', icon: '⚠️', label: 'Incidents' },
      { to: '/complaints', icon: '📋', label: 'Complaints' },
    ],
  },
  {
    section: 'Resources',
    items: [
      { to: '/schemes', icon: '📜', label: 'Gov. Schemes' },
      { to: '/prices', icon: '💰', label: 'Fish Prices' },
      { to: '/notifications', icon: '🔔', label: 'Notifications' },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/audit-logs', icon: '🔍', label: 'Audit Logs' },
    ],
  },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users': 'Fishermen Management',
  '/officers': 'Officer Management',
  '/sos': 'SOS Alert Monitor',
  '/incidents': 'Incident Reports',
  '/complaints': 'Complaint Resolution',
  '/schemes': 'Government Schemes',
  '/prices': 'Fish Market Prices',
  '/notifications': 'Broadcast Notifications',
  '/audit-logs': 'Audit Logs',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const currentTitle = PAGE_TITLES[location.pathname] || 'Admin Panel';

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.collapsed}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🎣</span>
          {sidebarOpen && (
            <div>
              <div className={styles.brandName}>KadalThunai</div>
              <div className={styles.brandSub}>கடல் துணை</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map(group => (
            <React.Fragment key={group.section}>
              {sidebarOpen && <div className={styles.navSection}>{group.section}</div>}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={!sidebarOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Bottom: user info + logout */}
        <div className={styles.sidebarBottom}>
          {sidebarOpen && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>{(user?.name || 'A')[0].toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userRole}>Administrator</div>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={logout} title="Logout">
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button className={styles.toggleBtn} onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <h1 className={styles.pageTitle}>{currentTitle}</h1>
          <div className={styles.topbarRight}>
            <div className={styles.statusDot} title="Backend connected" />
            <span className={styles.envBadge}>கடல் துணை</span>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
