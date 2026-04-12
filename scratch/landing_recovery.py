import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. แก้ไขโครงสร้าง Landing ให้กลับมากึ่งกลาง
old_landing = """          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="hero-landing">
              <div className="galaxy-bg-effect"></div>
              <div className="landing-content">"""

new_landing = """          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="hero-landing" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', width: '100%' }}>
              <div className="galaxy-bg-effect"></div>
              <div className="landing-content" style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>"""

content = content.replace(old_landing, new_landing)

# 2. ปรับแต่งปุ่ม Google ให้กลับมาหล่อและกึ่งกลาง
old_google_btn = """                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle}>
                      <img src="https://www.google.com/favicon.ico" width="20" alt="G" />
                      {t('googleLogin')}
                   </button>"""

new_google_btn = """                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle} style={{ width: '100%', maxWidth: '350px', margin: '20px auto' }}>
                      <img src="https://www.google.com/favicon.ico" width="24" alt="G" />
                      <span style={{ fontSize: '1.1rem' }}>{t('googleLogin')}</span>
                   </button>"""

content = content.replace(old_google_btn, new_google_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
