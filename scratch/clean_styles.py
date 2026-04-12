import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ปรับโครงสร้าง Dropdown ใน App.jsx ให้สะอาด
old_dropdown_block = """className="profile-dropdown-container glass-dark" 
              onClick={e => e.stopPropagation()} 
              style={{ padding: '30px', borderRadius: '25px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}"""

new_dropdown_block = """className="profile-dropdown-container" 
              onClick={e => e.stopPropagation()}"""

content = content.replace(old_dropdown_block, new_dropdown_block)

# ปรับปุ่ม Sign Out ให้ดูดีขึ้น
old_logout = """className="free-btn" onClick={handleLogout} style={{ width: '100%', background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', padding: '12px', borderRadius: '15px', border: '1px solid rgba(255,77,77,0.2)', fontWeight: '700', cursor: 'pointer' }}"""
new_logout = """className="logout-btn-dropdown" onClick={handleLogout} style={{ width: '100%', background: 'rgba(255,77,77,0.05)', color: '#ff4d4d', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,77,77,0.2)', fontWeight: '700', cursor: 'pointer', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}"""

content = content.replace(old_logout, new_logout)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
