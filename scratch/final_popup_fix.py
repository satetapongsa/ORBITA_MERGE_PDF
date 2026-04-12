import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ค้นหาและดึงส่วน Pay Modal ออกมา
import re
pay_modal_pattern = re.compile(r'<AnimatePresence>\\s+{showPayModal && \\(.*?<\\/AnimatePresence>', re.DOTALL)
pay_modal_match = pay_modal_pattern.search(content)

if pay_modal_match:
    pay_modal_code = pay_modal_match.group(0)
    # ลบออกจากจุดเดิม
    content = pay_modal_pattern.sub('', content)
    
    # เอาไปวางไว้ท้ายสุด ก่อนปิด layout-root div (หาจากอาศัย footer เป็นหลัก)
    content = content.replace('      </footer>', pay_modal_code + '\\n      </footer>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
