import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Check, FileText, Loader2, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { api, fileUrl } from '../api.js';
import { useAuth } from '../auth.jsx';

const STORE_KEY = 'ps_chat';
const SUGGESTIONS = [
  'Which files did I upload most recently?',
  'Find files that mention "invoice"',
  'Summarize my latest export',
  'หาไฟล์ที่มีคำว่า "สัญญา" ให้หน่อย',
];

const loadChat = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || []; } catch { return []; }
};
const saveChat = (messages) => {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
};

/** Minimal, safe formatting for replies: **bold**, `code`, bullet / numbered lists. */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Rich({ text }) {
  const blocks = [];
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);
    const type = bullet ? 'ul' : numbered ? 'ol' : 'p';
    const content = bullet?.[1] ?? numbered?.[1] ?? line.replace(/^#{1,6}\s+/, '');
    const last = blocks.at(-1);
    if (type !== 'p' && last?.type === type) last.items.push(content);
    else if (type !== 'p') blocks.push({ type, items: [content] });
    else if (content.trim()) blocks.push({ type: 'p', text: content });
  }
  return blocks.map((b, i) => {
    if (b.type === 'p') return <p key={i}>{inline(b.text)}</p>;
    const List = b.type;
    return <List key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</List>;
  });
}

function Locked({ name }) {
  return (
    <div className="card assistant-locked">
      <div className="tool-icon" style={{ width: 56, height: 56 }}><Lock size={24} /></div>
      <div className="eyebrow" style={{ justifyContent: 'center' }}>// pro feature</div>
      <h2>Ask {name} about your files</h2>
      <p className="muted">Find any document in seconds and get answers from inside your PDFs — in Thai or English.</p>
      <ul>
        <li><Check size={16} /> “Which contract mentions the delivery date?”</li>
        <li><Check size={16} /> “Summarize pages 3–5 of my latest report”</li>
        <li><Check size={16} /> “Find all files from last week”</li>
      </ul>
      <Link to="/account" className="btn btn-primary btn-lg"><Sparkles size={16} /> Upgrade to Pro — 20 THB/month</Link>
    </div>
  );
}

export default function Assistant() {
  const { account } = useAuth();
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { api('/assistant/info').then(setInfo).catch(() => {}); }, [account?.plan]);
  useEffect(() => { saveChat(messages); endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  async function send(text) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setError(null);
    setBusy(true);
    try {
      const d = await api('/assistant/chat', {
        method: 'POST',
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      setMessages([...next, { role: 'assistant', content: d.reply, sources: d.sources }]);
      setInfo((i) => i && { ...i, used: d.used });
    } catch (err) {
      setError(err.message);
      setMessages(messages);
      setInput(question);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  if (!info) return <div className="empty"><Loader2 className="spin" /></div>;
  const name = info.name;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Sparkles size={12} /> assistant</div>
          <h1>Ask about your files</h1>
          <p>Find documents and get answers from their contents.</p>
        </div>
        <div className="row">
          <span className="model-badge"><Sparkles size={13} /> {name}</span>
          {info.allowed && messages.length > 0 && (
            <button className="btn btn-sm" onClick={() => { setMessages([]); setError(null); }}><RotateCcw size={14} /> New chat</button>
          )}
        </div>
      </div>

      {!info.allowed ? <Locked name={name} /> : !info.enabled ? (
        <div className="alert alert-warn">The assistant is not configured on this server yet.</div>
      ) : (
        <div className="card chat">
          <div className="chat-log">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="tool-icon" style={{ width: 52, height: 52 }}><Sparkles size={24} /></div>
                <h2>Hi, I’m {name}</h2>
                <p className="muted">I can search everything you’ve uploaded or exported. Try one of these:</p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => <button key={s} className="btn btn-sm" onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === 'assistant' && <div className="msg-avatar"><Sparkles size={14} /></div>}
                <div className="msg-body">
                  {m.role === 'assistant' ? <Rich text={m.content} /> : <p>{m.content}</p>}
                  {m.sources?.length > 0 && (
                    <div className="sources">
                      <span className="mono small muted">Sources</span>
                      {m.sources.map((s) => (
                        <a key={s.id} href={fileUrl(s.id)} target="_blank" rel="noreferrer" className="source-chip">
                          <FileText size={12} /> {s.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="msg assistant">
                <div className="msg-avatar"><Sparkles size={14} /></div>
                <div className="msg-body thinking"><Loader2 size={14} className="spin" /> Searching your files…</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <div className="alert alert-error" style={{ margin: '0 16px 12px' }}>{error}</div>}

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder={`Message ${name}…`}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
              }}
              disabled={busy}
              autoFocus
            />
            <button className="btn btn-primary btn-icon" disabled={busy || !input.trim()} aria-label="Send"><ArrowUp size={18} /></button>
          </form>
          <div className="chat-foot mono">
            {info.used}/{info.limit} messages today · answers come only from your own files
          </div>
        </div>
      )}
    </>
  );
}
