import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, CreditCard, Info, Loader2, Sparkles, UserRound, ShieldCheck, KeyRound, Save } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';

function useCountdown(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(new Date(iso) - now, 0);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} ชม. ${String(m).padStart(2, '0')} นาที`;
}

function PlanCard({ name, price, limit, current, children, features }) {
  return (
    <div className={`plan ${current ? 'current' : ''}`}>
      {current && <span className="badge badge-pro tag">แพ็กเกจปัจจุบัน</span>}
      <div>
        <h3>{name}</h3>
        <div className="price">{price} <small>บาท / เดือน</small></div>
      </div>
      <ul>
        <li><Check size={16} /> ส่งออกได้ <b className="mono">{limit}</b>&nbsp;ครั้งต่อวัน</li>
        {features.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
      </ul>
      <div style={{ marginTop: 'auto' }}>{children}</div>
    </div>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user) setForm({ username: user.username, email: user.email || '' });
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api('/auth/profile', { method: 'PUT', body: form });
      setUser(d.user);
      toast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="pf-username">ชื่อผู้ใช้ (Username)</label>
        <input
          id="pf-username"
          type="text"
          className="input"
          required
          minLength={3}
          maxLength={32}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="pf-email">อีเมล (Email)</label>
        <input
          id="pf-email"
          type="email"
          className="input"
          placeholder="yourname@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <button className="btn btn-primary" disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} บันทึกข้อมูลโปรไฟล์
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/password', { method: 'POST', body: form });
      setForm({ currentPassword: '', newPassword: '' });
      toast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="cur">Current password</label>
        <input
          id="cur"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          placeholder="รหัสผ่านเดิมของคุณ"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="new">New password</label>
        <input
          id="new"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </div>
      <button className="btn" disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy && <Loader2 size={14} className="spin" />} Change password
      </button>
    </form>
  );
}

export default function Account() {
  const { user, account, setAccount } = useAuth();
  const [params, setParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const toast = useToast();
  const countdown = useCountdown(account?.resetsAt);

  useEffect(() => {
    api('/billing/config').then(setBilling).catch(() => {});
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      setNotice({ type: 'success', text: 'ยินดีต้อนรับสู่ Pro! สิทธิ์การใช้งานของคุณอัปเกรดเรียบร้อยแล้ว' });
      api('/billing/sync', { method: 'POST' }).then((d) => setAccount(d.account)).catch(() => {});
    } else if (checkout === 'cancelled') {
      setNotice({ type: 'info', text: 'ยกเลิกการชำระเงิน คุณยังไม่ถูกหักเงินใดๆ' });
    }
    if (checkout) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function action(name, path, body) {
    setBusy(name);
    try {
      const d = await api(path, { method: 'POST', body: body || {} });
      if (d.url) {
        if (d.url.startsWith('/')) {
          const sync = await api('/billing/sync', { method: 'POST' });
          setAccount(sync.account);
          setNotice({ type: 'success', text: 'เปิดใช้งาน Pro เรียบร้อยแล้ว (โหมดทดสอบ ไม่มีการตัดเงินจริง)' });
        } else {
          window.location.assign(d.url);
          return;
        }
      }
      if (d.account) setAccount(d.account);
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusy(null);
  }

  if (!account) return null;
  const isPro = account.plan === 'pro';
  const sub = account.subscription;
  const pct = Math.min((account.used / account.dailyLimit) * 100, 100);
  const periodEnd = sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'long' });
  const free = billing?.plans.free ?? { priceThb: 0, dailyLimit: 5 };
  const pro = billing?.plans.pro ?? { priceThb: 20, dailyLimit: 20 };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><UserRound size={12} /> บัญชีผู้ใช้</div>
          <h1>ข้อมูลบัญชีและการตั้งค่า (Account & Security)</h1>
          <p>จัดการข้อมูลส่วนตัว ความปลอดภัย และแพ็กเกจการใช้งานของคุณ</p>
        </div>
      </div>

      <div className="stack" style={{ gap: 24 }}>
        {notice && (
          <div className={`alert alert-${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />} {notice.text}
          </div>
        )}

        {/* TOP SECTION: Profile and Security positioned side-by-side at the top */}
        <div className="account-grid">
          {/* Profile Card */}
          <div className="card card-pad stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <UserRound size={20} color="var(--accent)" />
              <h2 style={{ margin: 0 }}>Profile</h2>
            </div>
            <p className="small muted">แก้ไขชื่อผู้ใช้และอีเมลสำหรับบัญชีของคุณ</p>
            <ProfileForm />
          </div>

          {/* Security Card */}
          <div className="card card-pad stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <ShieldCheck size={20} color="var(--accent)" />
              <h2 style={{ margin: 0 }}>Security</h2>
            </div>
            <p className="small muted">เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชี</p>
            <PasswordForm />
          </div>
        </div>

        {/* Usage & Overview */}
        <div className="account-grid">
          <div className="card card-pad stack">
            <div className="row">
              <h2>โควตาการใช้งานวันนี้</h2>
              <span className="spacer" />
              <span className={`badge ${isPro ? 'badge-pro' : ''}`}>{account.planName}</span>
            </div>
            <div className="stat-big">{account.used}<small> / {account.dailyLimit} ครั้ง</small></div>
            <div className={`meter lg ${pct >= 100 ? 'full' : ''}`}><span style={{ width: `${pct}%` }} /></div>
            <p className="small muted">
              เหลือสิทธิ์ <span className="mono">{account.remaining}</span> ครั้ง · รีเซ็ตสิทธิ์ตอนเที่ยงคืน ({account.timezone}) อีกใน <span className="mono">{countdown}</span>
            </p>
          </div>

          <div className="card card-pad stack">
            <h2>รายละเอียดบัญชี</h2>
            <dl className="kv">
              <dt>ชื่อผู้ใช้</dt><dd>{user.username}</dd>
              <dt>อีเมล</dt><dd>{user.email || <span className="muted">ยังไม่ได้ระบุ</span>}</dd>
              <dt>วันที่สมัคร</dt><dd>{new Date(user.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</dd>
              <dt>สถานะแพ็กเกจ</dt>
              <dd>
                {isPro
                  ? sub.cancelAtPeriodEnd ? <>สิ้นสุด {periodEnd}</> : <>ต่ออายุ {periodEnd}</>
                  : <span className="muted">แพ็กเกจฟรี (Free)</span>}
              </dd>
            </dl>
          </div>
        </div>

        {/* Plans */}
        <div>
          <div className="section-title" style={{ marginTop: 8 }}><h2>แพ็กเกจการใช้งาน</h2></div>
          {billing?.mode === 'mock' && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} /> โหมดทดสอบ: อัปเกรดเป็น Pro ได้ทันทีโดยไม่ต้องชำระเงินจริง
            </div>
          )}
          <div className="plan-grid">
            <PlanCard
              name="Free"
              price={free.priceThb}
              limit={free.dailyLimit}
              current={!isPro}
              features={['รวม แยก จัดเรียง และแปลงไฟล์', 'พื้นที่จัดเก็บไฟล์ส่วนตัว']}
            >
              {!isPro && <button className="btn btn-block" disabled>แพ็กเกจปัจจุบันของคุณ</button>}
            </PlanCard>

            <PlanCard
              name="Pro"
              price={pro.priceThb}
              limit={pro.dailyLimit}
              current={isPro}
              features={[
                'ฟีเจอร์ทั้งหมดในแพ็กเกจ Free',
                'AI ผู้ช่วย PageSmith 5.5 Pro — สอบถามข้อมูลเอกสารได้',
                'ต่ออายุรายเดือน ยกเลิกเมื่อไหร่ก็ได้',
              ]}
            >
              {!isPro ? (
                <button className="btn btn-primary btn-block btn-lg" onClick={() => action('upgrade', '/billing/checkout')} disabled={!!busy}>
                  {busy === 'upgrade' ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  อัปเกรดเพียง {pro.priceThb} บาท / เดือน
                </button>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {sub?.provider === 'stripe' && (
                    <button className="btn btn-block" onClick={() => action('portal', '/billing/portal')} disabled={!!busy}>
                      {busy === 'portal' ? <Loader2 size={16} className="spin" /> : <CreditCard size={16} />} จัดการการชำระเงินและใบเสร็จ
                    </button>
                  )}
                  {sub?.cancelAtPeriodEnd ? (
                    <button className="btn btn-primary btn-block" onClick={() => action('resume', '/billing/cancel', { resume: true })} disabled={!!busy}>
                      {busy === 'resume' && <Loader2 size={16} className="spin" />} ต่ออายุการใช้งาน Pro
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-block btn-danger" onClick={() => {
                      if (confirm(`ต้องการยกเลิก Pro หรือไม่? คุณยังใช้งาน Pro ได้จนถึง ${periodEnd}`)) action('cancel', '/billing/cancel');
                    }} disabled={!!busy}>
                      {busy === 'cancel' && <Loader2 size={16} className="spin" />} ยกเลิกแพ็กเกจ Pro
                    </button>
                  )}
                </div>
              )}
            </PlanCard>
          </div>
        </div>
      </div>
    </>
  );
}
