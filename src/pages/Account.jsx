import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, CreditCard, Info, Loader2, Sparkles, UserRound } from 'lucide-react';
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
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function PlanCard({ name, price, limit, current, children, features }) {
  return (
    <div className={`plan ${current ? 'current' : ''}`}>
      {current && <span className="badge badge-pro tag">Current plan</span>}
      <div>
        <h3>{name}</h3>
        <div className="price">{price} <small>THB / month</small></div>
      </div>
      <ul>
        <li><Check size={16} /> <b className="mono">{limit}</b>&nbsp;exports per day</li>
        {features.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
      </ul>
      <div style={{ marginTop: 'auto' }}>{children}</div>
    </div>
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
      toast('Password updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="cur">Current password</label>
        <input id="cur" type="password" className="input" autoComplete="current-password" required
          value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="new">New password</label>
        <input id="new" type="password" className="input" autoComplete="new-password" minLength={8} required
          value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
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
      setNotice({ type: 'success', text: 'Payment received — welcome to Pro! Your new daily limit is active now.' });
      api('/billing/sync', { method: 'POST' }).then((d) => setAccount(d.account)).catch(() => {});
    } else if (checkout === 'cancelled') {
      setNotice({ type: 'info', text: 'Checkout was cancelled. You have not been charged.' });
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
          setNotice({ type: 'success', text: 'Pro activated (test mode — no payment was taken).' });
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
          <div className="eyebrow"><UserRound size={12} /> account</div>
          <h1>Account & plan</h1>
          <p>Manage your subscription and see today’s usage.</p>
        </div>
      </div>

      <div className="stack" style={{ gap: 20 }}>
        {notice && (
          <div className={`alert alert-${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />} {notice.text}
          </div>
        )}

        <div className="account-grid">
          <div className="card card-pad stack">
            <div className="row">
              <h2>Today’s usage</h2>
              <span className="spacer" />
              <span className={`badge ${isPro ? 'badge-pro' : ''}`}>{account.planName}</span>
            </div>
            <div className="stat-big">{account.used}<small> / {account.dailyLimit} exports</small></div>
            <div className={`meter lg ${pct >= 100 ? 'full' : ''}`}><span style={{ width: `${pct}%` }} /></div>
            <p className="small muted">
              <span className="mono">{account.remaining}</span> left · resets at midnight ({account.timezone}) in <span className="mono">{countdown}</span>
            </p>
          </div>

          <div className="card card-pad stack">
            <h2>Profile</h2>
            <dl className="kv">
              <dt>Username</dt><dd>{user.username}</dd>
              <dt>Email</dt><dd>{user.email || <span className="muted">Not set</span>}</dd>
              <dt>Member since</dt><dd>{new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</dd>
              <dt>Subscription</dt>
              <dd>
                {isPro
                  ? sub.cancelAtPeriodEnd ? <>Ends {periodEnd}</> : <>Renews {periodEnd}</>
                  : <span className="muted">Free plan</span>}
              </dd>
            </dl>
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 8 }}><h2>Plans</h2></div>
          {billing?.mode === 'mock' && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} /> Test mode: Stripe isn’t configured, so upgrading activates Pro without charging.
            </div>
          )}
          <div className="plan-grid">
            <PlanCard name="Free" price={free.priceThb} limit={free.dailyLimit} current={!isPro}
              features={['Merge, split & reorder', 'Private file storage']}>
              {!isPro && <button className="btn btn-block" disabled>Your current plan</button>}
            </PlanCard>
            <PlanCard name="Pro" price={pro.priceThb} limit={pro.dailyLimit} current={isPro}
              features={['Everything in Free', 'PageSmith 5.5 Pro assistant — ask questions about your files', 'Billed monthly, cancel any time']}>
              {!isPro ? (
                <button className="btn btn-primary btn-block btn-lg" onClick={() => action('upgrade', '/billing/checkout')} disabled={!!busy}>
                  {busy === 'upgrade' ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  Upgrade for {pro.priceThb} THB / month
                </button>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {sub?.provider === 'stripe' && (
                    <button className="btn btn-block" onClick={() => action('portal', '/billing/portal')} disabled={!!busy}>
                      {busy === 'portal' ? <Loader2 size={16} className="spin" /> : <CreditCard size={16} />} Manage payment & invoices
                    </button>
                  )}
                  {sub?.cancelAtPeriodEnd ? (
                    <button className="btn btn-primary btn-block" onClick={() => action('resume', '/billing/cancel', { resume: true })} disabled={!!busy}>
                      {busy === 'resume' && <Loader2 size={16} className="spin" />} Keep my subscription
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-block btn-danger" onClick={() => {
                      if (confirm(`Cancel Pro? You keep Pro until ${periodEnd}, then return to the Free plan.`)) action('cancel', '/billing/cancel');
                    }} disabled={!!busy}>
                      {busy === 'cancel' && <Loader2 size={16} className="spin" />} Cancel subscription
                    </button>
                  )}
                </div>
              )}
            </PlanCard>
          </div>
        </div>

        <div className="card card-pad stack" style={{ maxWidth: 520 }}>
          <h2>Security</h2>
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
