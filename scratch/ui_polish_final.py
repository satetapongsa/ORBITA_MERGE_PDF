import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ปรับปรุงปุ่มใน Dropdown โปรไฟล์
old_dropdown_ui = """              {!isPro && (
                <div className='upgrade-banner'>
                  <div style={{ textAlign: 'left' }}>
                    <div className='cta-text' style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '0.95rem' }}>⭐ UPGRADE TO PRO</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('upgradeDesc')}</p>
                  </div>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} className='gold-btn-lux' style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', border: 'none' }}>Upgrade</button>
                </div>
              )}
              <button className="logout-btn-dropdown" onClick={handleLogout} style={{ width: '100%', background: 'rgba(255,77,77,0.05)', color: '#ff4d4d', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,77,77,0.2)', fontWeight: '700', cursor: 'pointer', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><LogOut size={16} /> Sign Out</button>"""

new_dropdown_ui = """              {!isPro && (
                <div className='upgrade-banner' style={{ marginBottom: '15px' }}>
                  <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '1rem' }}>⭐ UPGRADE TO PRO</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('upgradeDesc')}</p>
                  </div>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} className='dropdown-upgrade-btn'>Upgrade Now</button>
                </div>
              )}
              <button className="dropdown-logout-btn" onClick={handleLogout}><LogOut size={18} /> Sign Out</button>"""

content = content.replace(old_dropdown_ui, new_dropdown_ui)

# 2. แก้ปัญหาปุ่มลอย (X) ใน Pay Modal และจัดระเบียบใหม่
content = content.replace('<button className="close-btn-lux" onClick={() => setShowPayModal(false)}>×</button>', '<button className="close-btn-round" onClick={() => setShowPayModal(false)}>×</button>')

# กำจัดปุ่มปิด (X) ที่อาจหลงเหลืออยู่ในจุดอื่นๆ ของ Modal
content = content.replace('<button className="close-btn-lux" onClick={() => setShowAccountModal(false)} style={{ position: \'absolute\', top: \'20px\', right: \'20px\', background: \'none\', border: \'none\', color: \'#fff\', fontSize: \'1.5rem\', cursor: \'pointer\' }}>×</button>', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
