import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Combine, Download, FileArchive, FileText, Scissors, Sparkles, RefreshCw } from 'lucide-react';
import { api, downloadFile, formatBytes } from '../api.js';
import { useAuth } from '../auth.jsx';

const TOOLS = [
  { to: '/merge', icon: Combine, title: 'รวมไฟล์ PDF', text: 'รวมไฟล์ PDF หลายๆ ไฟล์เข้าด้วยกันตามลำดับที่คุณต้องการ' },
  { to: '/split', icon: Scissors, title: 'แยกไฟล์ PDF', text: 'แยกหน้าเอกสาร PDF เป็นรายหน้า หรือกำหนดช่วงหน้าที่ต้องการแยก' },
  { to: '/organize', icon: ArrowUpDown, title: 'จัดเรียงและหมุนหน้า', text: 'ลากสลับหน้า หมุนทิศทาง หรือลบหน้าที่ไม่ต้องการออกได้อิสระ' },
  { to: '/convert', icon: RefreshCw, title: 'แปลงและย่อไฟล์', text: 'แปลงภาพเป็น PDF, PDF เป็นภาพ/Word/ข้อความ และบีบอัดไฟล์ PDF' },
];

export default function Home() {
  const { user, account } = useAuth();
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    api('/files').then((d) => setRecent(d.files.filter((f) => f.kind === 'output').slice(0, 5))).catch(() => setRecent([]));
  }, []);

  return (
    <>
      <div className="hero">
        <div className="eyebrow">// พื้นที่ทำงาน</div>
        <h1>สวัสดีคุณ {user.username}, วันนี้ต้องการทำอะไร?</h1>
        <p>
          เลือกเครื่องมือเพื่อเริ่มต้นใช้งาน{' '}
          {account && <>วันนี้คุณเหลือสิทธิ์การส่งออก <b className="mono">{account.remaining}</b> จากทั้งหมด {account.dailyLimit} ครั้ง</>}
        </p>
      </div>

      <div className="tool-grid">
        {TOOLS.map(({ to, icon: Icon, title, text }, i) => (
          <Link key={to} to={to} className="tool-card">
            <span className="idx">0{i + 1}</span>
            <div className="tool-icon"><Icon size={22} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <span className="go">เปิดเครื่องมือ <ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>

      <Link to="/assistant" className="card assistant-banner">
        <div className="tool-icon"><Sparkles size={20} /></div>
        <div style={{ flex: 1 }}>
          <h3>ถาม PageSmith 5.5 Pro เกี่ยวกับเอกสารของคุณ <span className="badge badge-pro" style={{ marginLeft: 6 }}>Pro</span></h3>
          <p className="muted small">ค้นหาเอกสารหรือดึงคำตอบจากเนื้อหาข้างใน PDF ได้อย่างแม่นยำ รองรับภาษาไทยและอังกฤษ</p>
        </div>
        <ArrowRight size={16} color="var(--accent)" />
      </Link>

      <div className="section-title">
        <h2>ประวัติการส่งออกล่าสุด</h2>
        <Link to="/files" className="small">ดูไฟล์ทั้งหมด</Link>
      </div>
      <div className="card">
        {recent && recent.length === 0 && <div className="empty">ยังไม่มีประวัติการส่งออกไฟล์ของคุณ</div>}
        {recent && recent.length > 0 && (
          <table className="table">
            <tbody>
              {recent.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="name-cell">
                      {f.mime === 'application/zip' ? <FileArchive size={16} color="var(--accent)" /> : <FileText size={16} color="var(--accent)" />}
                      <span>{f.name}</span>
                    </div>
                  </td>
                  <td className="num hide-sm">{formatBytes(f.size)}</td>
                  <td className="num hide-sm">{new Date(f.createdAt).toLocaleString()}</td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => downloadFile(f)}><Download size={14} /> ดาวน์โหลด</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
