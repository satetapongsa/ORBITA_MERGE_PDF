import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# เราจะย้ายส่วนของ Pay Modal ที่มี AnimatePresence คลุมอยู่
# หาจุดเริ่มและจุดจบแบบ Manual
start_tag = '<AnimatePresence>'
# เราต้องหาตัวที่ 2 เพราะตัวแรกคือ Main Content
first_anim = content.find(start_tag)
second_anim = content.find(start_tag, first_anim + 1)

if second_anim != -1:
    # หาจุดปิดของ AnimatePresence ตัวที่สอง
    end_tag = '</AnimatePresence>'
    end_idx = content.find(end_tag, second_anim) + len(end_tag)
    
    pay_modal_code = content[second_anim:end_idx]
    
    # ลบออกจากที่เดิม
    new_content = content[:second_anim] + content[end_idx:]
    
    # เอาไปวางไว้หน้าปิด layout-root (หลัง footer)
    new_content = new_content.replace('</footer>', '</footer>\n      ' + pay_modal_code)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
