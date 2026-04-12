import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ปรับเปลี่ยนโครงสร้างส่วน Landing ใหม่ทั้งหมดให้เป็นแบบ Split
old_landing_block = """          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="hero-landing" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', width: '100%' }}>
              <div className="galaxy-bg-effect"></div>
              <div className="landing-content" style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="badge-premium">ORBITA GALAXY V2.0</motion.div>
                <h1 className="display-title">{t('landingTitle')} <span className="text-gradient">ORBITA</span></h1>
                <p className="hero-desc"><b>{t('landingDesc')}</b> 🛡️ Privacy First. Local Processing.</p>
                <div className="auth-card-luxury glass-dark">
                   <div className="auth-header">
                      <Sparkles size={32} color="#ffd700" />
                      <h2>{t('welcomeBack')}</h2>
                      <p>{t('loginSubtitle')}</p>
                   </div>
                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle} style={{ width: '100%', maxWidth: '350px', margin: '20px auto' }}>
                      <img src="https://www.google.com/favicon.ico" width="24" alt="G" />
                      <span style={{ fontSize: '1.1rem' }}>{t('googleLogin')}</span>
                   </button>
                   <p className="auth-footer">Secure OAuth 2.0 • Data is encrypted</p>
                </div>
              </div>
            </motion.div>
          ) : ("""

new_landing_block = """          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-landing-split">
              <div className="galaxy-bg-effect"></div>
              
              <div className="landing-text-side animate-fade">
                <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="badge-premium" style={{ marginBottom: '2rem' }}>ORBITA GALAXY V2.0</motion.div>
                <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="display-title-lux">
                  Unlock PDF <br/> Magic with <br/><span className="text-gradient">ORBITA</span>
                </motion.h1>
                <motion.p initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="hero-desc" style={{ fontSize: '1.4rem', maxWidth: '600px', lineHeight: 1.6, opacity: 0.8 }}>
                  {t('landingDesc')} <br/>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', color: '#00ff88', fontSize: '1rem', fontWeight: '800' }}>
                    <ShieldCheck size={20}/> Privacy First. 100% Local Processing.
                  </span>
                </motion.p>
              </div>

              <div className="landing-auth-side">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="auth-card-luxury">
                   <div className="auth-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <div style={{ background: 'rgba(255,215,0,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Sparkles size={32} color="#ffd700" />
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('welcomeBack')}</h2>
                      <p style={{ opacity: 0.6 }}>{t('loginSubtitle')}</p>
                   </div>
                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle}>
                      <img src="https://www.google.com/favicon.ico" width="24" alt="G" />
                      <span>{t('googleLogin')}</span>
                   </button>
                   <div style={{ marginTop: '30px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                      <p>Secure OAuth 2.0 Encryption</p>
                      <p style={{ marginTop: '5px' }}>Trusted by 10,000+ Users</p>
                   </div>
                </motion.div>
              </div>
            </motion.div>
          ) : ("""

content = content.replace(old_landing_block, new_landing_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
