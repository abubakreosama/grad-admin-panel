import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getEmail } from '../lib/api';
import './Layout.css';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/agents', label: 'Agents', icon: <AgentsIcon /> },
  { to: '/conversations', label: 'Conversations', icon: <ConversationsIcon /> },
  { to: '/organization', label: 'Organization', icon: <OrgIcon /> },
  { to: '/playground', label: 'AI Playground', icon: <PlaygroundIcon /> },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const navigate = useNavigate();
  const email = getEmail() ?? 'User';

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
          <div className="user-avatar">
            {getInitials(email)}
          </div>
          <div className="user-info">
            <div className="user-name">{email}</div>
            <div className="user-role">Click to log out</div>
          </div>
          <ChevronIcon />
        </div>
      </aside>

      <div className="layout-right">
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M9 6V4M15 6V4" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M9 16h6" />
    </svg>
  );
}

function ConversationsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function OrgIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v4c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 10v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" />
    </svg>
  );
}

function PlaygroundIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3h6l1 8H8L9 3z" />
      <path d="M8 11l-3 9h14l-3-9" />
      <path d="M10 6h4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
