import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# แก้ไขจุดที่ผิดพลาด จาก && กลับเป็น ? เพื่อให้ ternary สมบูรณ์
old_broken = '''          {user && (
            <div className="user-profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>'''

new_fixed = '''          {user ? (
            <div className="user-profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>'''

content = content.replace(old_broken, new_fixed)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
