import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ปรับปรุงโครงสร้าง Header ของ Workspace
old_ws_header = """                    <div className="workspace-header">
                       <button className="back-btn-lux glass\""""

new_ws_header = """                    <div className="workspace-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                       <button className="back-btn-lux\""""

content = content.replace(old_ws_header, new_ws_header)

# แก้ไข Inline Style ตกค้างของปุ่ม Back
content = content.replace("""style={{ padding: '12px 25px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff' }}""", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
