import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ใส่เงื่อนไขให้ Header แสดงเฉพาะเมื่อมี user ล็อคอินแล้วเท่านั้น
old_header_tag = '<header className="top-header glass-header">'
new_header_tag = '{user && <header className="top-header glass-header">'

content = content.replace(old_header_tag, new_header_tag)

# ปิด Tag Header ด้วย }
old_header_end = '</header>'
new_header_end = '</header>}'

content = content.replace(old_header_end, new_header_end)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
