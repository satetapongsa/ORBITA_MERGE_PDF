import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. เพิ่ม Security Indicator ใน Workspace
old_ws_header_end = '</h2>\\n                       </div>\\n                    </div>'
new_ws_header_end = old_ws_header_end + """
                       <div className="security-badge glass-sm" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.05)' }}>
                          <ShieldCheck size={16} color="#00ff88" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#00ff88' }}>SECURE LOCAL PROCESSING</span>
                       </div>"""

content = content.replace(old_ws_header_end.replace('\\n', '\n'), new_ws_header_end.replace('\\n', '\n'))

# 2. เพิ่มระบบ Error Handling ที่ดีขึ้นในฟังก์ชันประมวลผลไฟล์ (ล้อมด้วย Try-Catch พิเศษ)
# ส่วนนี้ปกติมีอยู่แล้ว แต่ผมจะอัปเกรดให้แจ้งสถานะผ่าน status toast แทนการ Console Log อย่างเดียว
content = content.replace("catch (err) { console.error(err); }", "catch (err) { setStatus({type: 'error', msg: 'Processing failed. Your file is secure but unsupported.'}); setLoading(false); }")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
