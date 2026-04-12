import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """              {payStep === 'checkout' && (
                <div className="checkout-step animate-fade text-center">
                  <h3>สแกนเพื่ออัปเกรดเป็น Pro</h3>
                  <div className="qr-checkout glass animate-up" style={{ padding: '2rem' }}>
                    <p className="price-tag">฿59.00</p>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>ชื่อบัญชี: ORBITA PDF Pro Subscription</p>
                    
                    <div className="qr-container">
                      <img
                        src={`https://promptpay.io/${promptPayNumber}/59.00.png`}
                        alt="PromptPay QR Code"
                        className="pp-qr"
                      />
                    </div>

                    <div className="payment-status-box" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px', fontSize: '0.9rem' }}>
                      <p style={{ color: '#00ff88', fontWeight: 600, marginBottom: '0.5rem' }}>ระบบกำลังรอการโอนเงิน...</p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>กรุณาโอนเงินภายใน 2:00 นาที</p>
                    </div>

                    <button className="cta-btn secure-btn" style={{ marginTop: '2rem', width: '100%' }} onClick={() => { setIsPro(true); setPayStep('success'); }}>
                      แจ้งโอนเงินเรียบร้อย
                    </button>

                    <button className="back-text" style={{ marginTop: '1.5rem', display: 'block', margin: '1.5rem auto 0' }} onClick={() => setPayStep('plans')}>
                      ← ย้อนกลับ
                    </button>
                  </div>
                </div>
              )}\n"""

# Replace lines 752 to 807 (1-indexed, so index 751 to 807)
lines[751:807] = [new_content]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
