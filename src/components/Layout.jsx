import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileStack, FolderOpen, LayoutGrid, LogOut, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../auth.jsx';

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <span className="brand-mark"><FileStack size={16} /></span>
      PageSmith <small>/pdf</small>
    </Link>
  );
}

function UsagePill({ account }) {
  const pct = Math.min((account.used / account.dailyLimit) * 100, 100);
  return (
    <Link to="/account" className="usage" title="Exports used today — resets at midnight">
      <span className={`badge ${account.plan === 'pro' ? 'badge-pro' : ''}`}>{account.planName}</span>
      <span className="usage-text"><b>{account.used}</b>/{account.dailyLimit} today</span>
      <span className={`meter ${pct >= 100 ? 'full' : ''}`}><span style={{ width: `${pct}%` }} /></span>
    </Link>
  );
}

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        {user.username.slice(0, 1)}
      </button>
      {open && (
        <div className="menu" onClick={() => setOpen(false)}>
          <div className="menu-head">
            <div style={{ fontWeight: 600 }}>{user.username}</div>
            {user.email && <div className="small muted">{user.email}</div>}
          </div>
          <Link to="/account"><UserRound size={16} /> Account & plan</Link>
          <Link to="/files"><FolderOpen size={16} /> My files</Link>
          <button onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, account, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav className="nav">
            <NavLink to="/" end><LayoutGrid size={16} /><span>Tools</span></NavLink>
            <NavLink to="/files"><FolderOpen size={16} /><span>My files</span></NavLink>
            <NavLink to="/assistant"><Sparkles size={16} /><span>Assistant</span><span className="pro-tag">PRO</span></NavLink>
            <NavLink to="/account"><UserRound size={16} /><span>Account</span></NavLink>
          </nav>
          <div className="topbar-right">
            {account && <UsagePill account={account} />}
            <UserMenu user={user} onSignOut={async () => { await signOut(); navigate('/login'); }} />
          </div>
        </div>
      </header>
      <main className="main"><Outlet /></main>
      <footer className="footer mono">PageSmith · files are stored privately in your account</footer>
    </div>
  );
}
