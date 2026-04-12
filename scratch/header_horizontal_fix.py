import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ปรับปรุงโครงสร้าง Header Actions ให้เป็น Flex Horizontal
old_header_actions = """        <div className="header-actions">
          <div className="lang-toggle glass-sm">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>

          {user ? (
            <div className="user-profile-actions">"""

new_header_actions = """        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="lang-toggle glass-sm">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>

          {user && (
            <div className="user-profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>"""

content = content.replace(old_header_actions, new_header_actions)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
