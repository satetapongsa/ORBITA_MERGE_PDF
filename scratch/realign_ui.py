import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ทำให้ Logo คลิกได้ (Reset กลับหน้าหลัก)
old_logo = '''<div className="logo-section">'''
new_logo = '''<div className="logo-section clickable" onClick={() => {setActiveTool(null); setFiles([]); setItems([]); window.scrollTo({top: 0, behavior: 'smooth'});}}>'''
content = content.replace(old_logo, new_logo)

# 2. ปรับปรุงตำแหน่ง Profile Modal ให้เป็น Dropdown บนขวา
old_modal = """{showAccountModal && user && (
          <div className="modal-overlay blur-overlay" onClick={() => setShowAccountModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="pay-modal-lux glass-dark" onClick={e => e.stopPropagation()} style={{ padding: '40px', borderRadius: '35px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
              <div className="modal-header" style={{ marginBottom: '2rem' }}>"""

new_modal = """{showAccountModal && user && (
          <div className="modal-overlay" style={{ background: 'transparent' }} onClick={() => setShowAccountModal(false)}>
            <motion.div 
              initial={{ y: -20, opacity: 0, scale: 0.95 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: -20, opacity: 0, scale: 0.95 }} 
              className="profile-dropdown-container glass-dark" 
              onClick={e => e.stopPropagation()} 
              style={{ padding: '30px', borderRadius: '25px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            >
              <div className="modal-header" style={{ marginBottom: '1.5rem' }}>"""

content = content.replace(old_modal, new_modal)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
