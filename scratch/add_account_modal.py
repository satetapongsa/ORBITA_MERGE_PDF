import sys
import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add showAccountModal state
if 'const [showAccountModal, setShowAccountModal] = useState(false);' not in content:
    content = content.replace('export default function App() {', 'export default function App() {\n  const [showAccountModal, setShowAccountModal] = useState(false);')

# 2. Update Header to open modal
content = content.replace(
    'className="user-info glass"',
    'className="user-info glass" style={{ cursor: "pointer" }} onClick={() => setShowAccountModal(true)}'
)

# 3. Add AccountModal component (Simulation for now)
account_modal_code = """
      {/* --- Account Management Modal --- */}
      <AnimatePresence>
        {showAccountModal && user && (
          <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
            <motion.div 
              className="pay-modal glass animate-up" 
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header">
                <div className="profile-large-img" style={{ margin: '0 auto 1.5rem' }}>
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #00f2ff' }} />
                </div>
                <h2>Member Workspace</h2>
                <p style={{ color: '#94a3b8' }}>{user.email}</p>
              </div>

              <div className="account-info-grid" style={{ display: 'grid', gap: '1rem', margin: '2rem 0' }}>
                <div className="info-item glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="label" style={{ opacity: 0.6 }}>Status</span>
                  <span className="val" style={{ fontWeight: 800, color: isPro ? '#00ff88' : '#fff' }}>{isPro ? 'PREMIUM MEMBER' : 'FREE PLAN'}</span>
                </div>
              </div>

              <div className="account-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!isPro && (
                  <button className="cta-btn gold-btn" onClick={() => { setShowAccountModal(false); setShowPayModal(true); }}>
                    🏆 Upgrade to Premium
                  </button>
                )}
                <button className="free-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>

              <button className="close-btn" onClick={() => setShowAccountModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
"""

# Insert before the last return or closing tag of App.
if 'Account Management Modal' not in content:
    content = content.replace('      <AnimatePresence>', account_modal_code + '\n      <AnimatePresence>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
