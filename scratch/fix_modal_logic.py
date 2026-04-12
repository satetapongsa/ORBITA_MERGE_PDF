import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. แทรกปุ่ม Upgrade ใน Account Modal
old_block = """<div style={{ marginTop: '1rem', background: isPro ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: isPro ? '#000' : '#fff', padding: '5px 15px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '800', display: 'inline-block' }}>{isPro ? 'PREMIUM MEMBER' : 'FREE USER'}</div>
              </div>"""

new_block = old_block + """
              {!isPro && (
                <div className='upgrade-banner'>
                  <div style={{ textAlign: 'left' }}>
                    <div className='cta-text' style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '0.9rem' }}>⭐ UPGRADE TO PRO</div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>ปลดล็อคทุกเครื่องมือ จัดการ PDF ได้ไร้ขีดจำกัด</p>
                  </div>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} className='gold-btn-lux' style={{ padding: '8px 15px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', border: 'none' }}>Upgrade</button>
                </div>
              )}"""

content = content.replace(old_block, new_block)

# 2. แก้ไขส่วน Modal ชำระเงินให้ใช้ Class ที่ถูกต้อง
content = content.replace("className='gold-btn-lux full-width'", "className='gold-btn-lux' style={{ width: '100%', padding: '16px', borderRadius: '15px', fontWeight: '800', border: 'none', cursor: 'pointer', marginTop: '10px' }}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
