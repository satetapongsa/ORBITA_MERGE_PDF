import re

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. จัดการส่วน Header
# เราจะหาจุดเริ่ม <div className="header-actions"> จนถึงจุดปิด </div> ตัวที่สอง (ที่ปิด header-actions)
header_pattern = re.compile(r'<div className="header-actions">.*?</div>\s+</div>', re.DOTALL)
new_header = """<div className="header-actions">
          <div className="lang-toggle glass">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          
          {user && (
            <div className="user-profile-group">
              <div className="user-info glass" style={{ cursor: 'pointer' }} onClick={() => setShowAccountModal(true)}>
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="user-avatar" />
                <span className="user-name">{user.user_metadata.full_name}</span>
              </div>
              <button className="logout-btn glass" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}

          {!isPro && user && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pro-btn glass" onClick={() => setShowPayModal(true)}>
              <Zap size={16} fill="#ffd700" color="#ffd700" /> {t('unlockPro')}
            </motion.button>
          )}

          {isPro && (
            <div className="pro-active-badge neon-green">
              <ShieldCheck size={16} /> Premium
            </div>
          )}
        </div>
      </div>"""

content = header_pattern.sub(new_header, content)

# 2. จัดการส่วน Main Content และ Auth Gate
# เราจะล้าง AnimatePresence ตัวเดิมที่อาจจะเละอยู่
main_content_pattern = re.compile(r'<AnimatePresence mode="wait">.*?!activeTool \? \(', re.DOTALL)
new_main_start = """<AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key='auth-gate'
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className='auth-gate'
          >
            <div className='hero-section text-center'>
                <div className='badge'>SaaS-Ready PDF Platform</div>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Experience PDF Magic with <span className='text-gradient'>ORBITA</span></h1>
                <p className='hero-subtitle' style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto 3rem' }}>ล็อคอินด้วย Google เพื่อเริ่มใช้งานและประมวลผลไฟล์ของคุณอย่างปลอดภัยบนบราวเซอร์</p>
                <div className='auth-card glass animate-up' style={{ padding: '3rem', maxWidth: '450px', margin: '0 auto', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className='app-icon' style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px', fontSize: '2rem' }}><Sparkles size={32} color='#00f2ff' /></div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Member Access</h2>
                    <p style={{ opacity: 0.6, marginBottom: '2rem' }}>เข้าสู่ระบบเพื่อจดจำการตั้งค่าและรับสิทธิ์ใช้งานระดับ Pro</p>
                    <button className='cta-btn gold-btn' style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '1rem' }} onClick={signInWithGoogle}>
                        <img src='https://www.google.com/favicon.ico' width='20' alt='G' /> Continue with Google
                    </button>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.5 }}>No password required. Secure Google OAuth 2.0</p>
                </div>
            </div>
          </motion.div>
        ) : (
          <>
            {!activeTool ? ("""

content = main_content_pattern.sub(new_main_start, content)

# 3. ใส่จุดปิดท้ายที่เป๊ะที่สุด
# ล้างของเดิมท้ายไฟล์ออกก่อน
content = content.replace('          </>\n        )}', '')
content = content.replace('        </>\n        )}', '')
# ใส่ปิดเงื่อนไขทับ footer
content = content.replace('      <footer>', '          </>\n        )}\n      <footer>')

# แก้ไขจุดปิด activeTool ternary
content = content.replace('          )}\n      </AnimatePresence>', '          )}\n      </AnimatePresence>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
