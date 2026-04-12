import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. แก้ไข Overlay ให้ใส ไม่เบลอตามคำขอ
content = content.replace('<div className="modal-overlay" style={{ background: \'transparent\' }} onClick={() => setShowAccountModal(false)}>', 
                         '<div className="modal-overlay" style={{ background: \'transparent\', backdropFilter: \'none\', WebkitBackdropFilter: \'none\' }} onClick={() => setShowAccountModal(false)}>')

# 2. ปรับจูนปุ่ม Upgrade และ Sign Out ใน Dropdown ให้หล่อกริบ (Full Width + High Contrast)
old_ui_block = """              {!isPro && (
                <div className='upgrade-banner' style={{ marginBottom: '15px' }}>
                  <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '1rem' }}>⭐ UPGRADE TO PRO</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('upgradeDesc')}</p>
                  </div>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} className='dropdown-upgrade-btn'>Upgrade Now</button>
                </div>
              )}
              <button className="dropdown-logout-btn" onClick={handleLogout}><LogOut size={18} /> Sign Out</button>"""

new_ui_block = """              {!isPro && (
                <div style={{ background: 'rgba(255,215,0,0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.3)', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                    <div style={{ color: '#ffd700', fontWeight: '900', fontSize: '1.1rem' }}>⭐ {t('unlockPro')}</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('upgradeDesc')}</p>
                  </div>
                  <button 
                    onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} 
                    style={{ width: '100%', background: 'linear-gradient(135deg, #ffd700, #ff8c00)', color: '#000', padding: '14px', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 10px 20px rgba(255,215,0,0.2)' }}
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
              <button 
                onClick={handleLogout} 
                style={{ width: '100%', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,77,77,0.2)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <LogOut size={18} /> Sign Out
              </button>"""

content = content.replace(old_ui_block, new_ui_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
