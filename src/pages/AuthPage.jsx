import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpDown, Combine, Loader2, Lock, Scissors, Sparkles } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Brand } from '../components/Layout.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(mode, isLogin ? { username: form.username, password: form.password } : form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-side">
        <Brand to={isLogin ? '/login' : '/register'} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>PDF tools that get out of your way.</h2>
          <ul>
            <li><span className="k"><Combine size={16} /></span> Merge documents in the order you choose</li>
            <li><span className="k"><Scissors size={16} /></span> Split by page or by custom ranges</li>
            <li><span className="k"><ArrowUpDown size={16} /></span> Drag pages to reorder, rotate or remove</li>
            <li><span className="k"><Lock size={16} /></span> Files kept privately in your own space</li>
            <li><span className="k"><Sparkles size={16} /></span> Pro: ask PageSmith 5.5 Pro about your files</li>
          </ul>
        </div>
        <div className="terminal">free: 5 exports/day · pro: 20 exports/day · 20 THB/mo</div>
      </section>

      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <div className="eyebrow">{isLogin ? '// sign in' : '// create account'}</div>
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              {isLogin ? 'Sign in to continue to your workspace.' : 'Free plan includes 5 exports every day.'}
            </p>
          </div>

          {error && <div className="alert alert-error"><AlertCircle size={16} />{error}</div>}

          <div className="field">
            <label htmlFor="username">{isLogin ? 'Username or email' : 'Username'}</label>
            <input id="username" className="input" autoComplete="username" autoFocus required
              value={form.username} onChange={set('username')} />
          </div>
          {!isLogin && (
            <div className="field">
              <label htmlFor="email">Email <span className="muted" style={{ fontWeight: 400 }}>(optional, for receipts)</span></label>
              <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} />
            </div>
          )}
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="input" required minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} />
            {!isLogin && <span className="hint">At least 8 characters.</span>}
          </div>

          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <Loader2 size={18} className="spin" />}
            {isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="divider-text">
            {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}
          </p>
        </form>
      </main>
    </div>
  );
}
