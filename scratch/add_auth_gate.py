import sys
import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Auth Gate (Landing page for non-logged in users)
auth_gate_code = """
        {!user ? (
          <motion.div 
            key="auth-gate"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="auth-gate"
          >
            <div className="hero-section text-center">
                <div className="badge">SaaS-Ready PDF Platform</div>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Experience PDF Magic with <span className="text-gradient">ORBITA</span></h1>
                <p className="hero-subtitle" style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto 3rem' }}>ล็อคอินด้วย Google เพื่อเริ่มใช้งานและประมวลผลไฟล์ของคุณอย่างปลอดภัยบนบราวเซอร์</p>
                
                <div className="auth-card glass animate-up" style={{ padding: '3rem', maxWidth: '450px', margin: '0 auto', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="app-icon" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px', fontSize: '2rem' }}><Sparkles size={32} color="#00f2ff" /></div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Member Access</h2>
                    <p style={{ opacity: 0.6, marginBottom: '2rem' }}>เข้าสู่ระบบเพื่อจดจำการตั้งค่าและรับสิทธิ์ใช้งานระดับ Pro</p>
                    <button className="cta-btn gold-btn" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '1rem' }} onClick={signInWithGoogle}>
                        <img src="https://www.google.com/favicon.ico" width="20" alt="G" /> Continue with Google
                    </button>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.5 }}>No password required. Secure Google OAuth 2.0</p>
                </div>
            </div>
          </motion.div>
        ) : (
"""

# Insert the Auth Gate after AnimatePresence mode="wait"
if 'key="auth-gate"' not in content:
    content = content.replace('<AnimatePresence mode="wait">', '<AnimatePresence mode="wait">\n' + auth_gate_code)
    
    # Close the block before footer
    content = content.replace('      <footer>', '        )}\n      <footer>')

# Ensure we have appropriate CSS
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
