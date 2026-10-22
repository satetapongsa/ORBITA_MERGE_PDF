import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileStack, FolderOpen, LayoutGrid, LogOut, RefreshCw, Sparkles, UserRound } from 'lucide-react';
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
    <Link to="/account" className="usage" title="สิทธิ์การใช้งานวันนี้ — รีเซ็ตทุกเที่ยงคืน">
      <span className={`badge ${account.plan === 'pro' ? 'badge-pro' : ''}`}>{account.planName}</span>
      <span className="usage-text">ใช้ไป <b>{account.used}</b>/{account.dailyLimit} วันนี้</span>
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
          <Link to="/account"><UserRound size={16} /> ข้อมูลบัญชีและแพ็กเกจ</Link>
          <Link to="/files"><FolderOpen size={16} /> ไฟล์ของฉัน</Link>
          <button onClick={onSignOut}><LogOut size={16} /> ออกจากระบบ</button>
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
            <NavLink to="/" end><LayoutGrid size={16} /><span>เครื่องมือทั้งหมด</span></NavLink>
            <NavLink to="/convert"><RefreshCw size={16} /><span>แปลงและย่อไฟล์</span></NavLink>
            <NavLink to="/files"><FolderOpen size={16} /><span>ไฟล์ของฉัน</span></NavLink>
            <NavLink to="/assistant"><Sparkles size={16} /><span>AI ผู้ช่วย</span><span className="pro-tag">PRO</span></NavLink>
            <NavLink to="/account"><UserRound size={16} /><span>บัญชีผู้ใช้</span></NavLink>
          </nav>
          <div className="topbar-right">
            {account && <UsagePill account={account} />}
            <UserMenu user={user} onSignOut={async () => { await signOut(); navigate('/login'); }} />
          </div>
        </div>
      </header>
      <main className="main"><Outlet /></main>
      <footer className="footer mono">PageSmith · ไฟล์ของคุณถูกจัดเก็บอย่างปลอดภัยและเป็นส่วนตัวในบัญชีของคุณ</footer>
    </div>
  );
}
