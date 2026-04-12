import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ปรับเป้าหมายให้ใช้สไตล์ Popup กึ่งกลาง
old_pay_block = """<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="pay-modal-lux glass-dark" onClick={e => e.stopPropagation()}>"""
new_pay_block = """<motion.div className="pay-modal-lux" onClick={e => e.stopPropagation()} style={{ padding: '50px', textAlign: 'center' }}>"""

content = content.replace(old_pay_block, new_pay_block)

# ปรับปรุงปุ่มปิดใน Modal ชำระเงิน
old_close = """<button className="close-btn-lux" onClick={() => setShowPayModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>"""
new_close = """<button className="close-btn-lux" onClick={() => setShowPayModal(false)} style={{ position: 'absolute', top: '25px', right: '30px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>"""

content = content.replace(old_close, new_close)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
