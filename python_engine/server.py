import os
import re
import sys
import io
import time
import uuid
import json
import shutil
import base64
import logging
import threading
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from PIL import Image
from pypdf import PdfReader, PdfWriter
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import yt_dlp

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = logging.getLogger("ORBITA_ENGINE")

PORT = 5001
BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
DOWNLOADS_DIR = BASE_DIR / "downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path='')

JOBS = {}
JOBS_LOCK = threading.Lock()

def cleanup_old_jobs():
    while True:
        try:
            time.sleep(900)
            now = time.time()
            with JOBS_LOCK:
                expired_ids = []
                for jid, job in list(JOBS.items()):
                    if now - job.get('created_at', now) > 3600:
                        expired_ids.append(jid)
                for jid in expired_ids:
                    job = JOBS.pop(jid, None)
                    if job and 'dir' in job and os.path.exists(job['dir']):
                        try:
                            shutil.rmtree(job['dir'], ignore_errors=True)
                        except Exception:
                            pass
            if DOWNLOADS_DIR.exists():
                for item in DOWNLOADS_DIR.iterdir():
                    try:
                        if item.is_dir() and (now - item.stat().st_mtime > 3600):
                            shutil.rmtree(str(item), ignore_errors=True)
                        elif item.is_file() and (now - item.stat().st_mtime > 3600):
                            item.unlink(missing_ok=True)
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

cleanup_thread = threading.Thread(target=cleanup_old_jobs, daemon=True)
cleanup_thread.start()

def format_bytes(num_bytes):
    if not num_bytes or num_bytes <= 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"

def format_duration(seconds):
    if not seconds:
        return "00:00"
    seconds = int(seconds)
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

@app.route('/')
def index():
    if DIST_DIR.exists() and (DIST_DIR / 'index.html').exists():
        return send_from_directory(str(DIST_DIR), 'index.html')
    return jsonify({
        "status": "online",
        "service": "ORBITA Studio Unified Engine",
        "version": "2.5.0",
        "port": PORT,
        "hint": "Vite dev server is recommended on http://localhost:3003 or run 'npm run build' to serve from port 5001."
    })

# ── Health check ──
@app.route('/api/health', methods=['GET', 'OPTIONS'])
def api_health():
    if request.method == 'OPTIONS':
        return ('', 204)
    ffmpeg_installed = shutil.which("ffmpeg") is not None
    return jsonify({
        "status": "online",
        "service": "ORBITA Studio Unified Engine",
        "version": "2.5.0",
        "capabilities": [
            "merge_pdf",
            "images_to_pdf",
            "split_pdf",
            "extract_text",
            "video_downloader",
            "video_to_audio",
            "convert_video",
            "export_docx",
            "extract_docx",
            "batch_image_zip"
        ],
        "ffmpeg": ffmpeg_installed,
        "port": PORT
    })

# ── 1. Native PDF: Merge ──
@app.route('/api/merge', methods=['POST', 'OPTIONS'])
def api_merge():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    files = data.get("files", [])
    page_orders = data.get("page_orders", [])
    if not files:
        return jsonify({"error": "No files provided"}), 400

    readers = []
    for f in files:
        pdf_bytes = base64.b64decode(f["base64"])
        readers.append(PdfReader(io.BytesIO(pdf_bytes)))

    writer = PdfWriter()
    if page_orders:
        for item in page_orders:
            f_idx = item["file_index"]
            p_idx = item["page_index"]
            rot = item.get("rotation", 0)
            page = readers[f_idx].pages[p_idx]
            if rot:
                page.rotate(rot)
            writer.add_page(page)
    else:
        for reader in readers:
            for page in reader.pages:
                writer.add_page(page)

    out_stream = io.BytesIO()
    writer.write(out_stream)
    out_base64 = base64.b64encode(out_stream.getvalue()).decode('utf-8')
    return jsonify({"success": True, "result_base64": out_base64})

# ── 2. Native PDF: Images to PDF ──
@app.route('/api/images-to-pdf', methods=['POST', 'OPTIONS'])
def api_images_to_pdf():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    raw_images = data.get("images", [])
    if not raw_images:
        return jsonify({"error": "No images provided"}), 400

    pil_images = []
    for item in raw_images:
        img_bytes = base64.b64decode(item["base64"])
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        pil_images.append(img)

    out_stream = io.BytesIO()
    if pil_images:
        pil_images[0].save(out_stream, format="PDF", save_all=True, append_images=pil_images[1:], resolution=300.0)

    out_base64 = base64.b64encode(out_stream.getvalue()).decode('utf-8')
    return jsonify({"success": True, "result_base64": out_base64})

# ── 3. Native PDF: Extract Text ──
@app.route('/api/extract-text', methods=['POST', 'OPTIONS'])
def api_extract_text():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    files = data.get("files", [])
    extracted_text = []

    for f in files:
        pdf_bytes = base64.b64decode(f["base64"])
        reader = PdfReader(io.BytesIO(pdf_bytes))
        file_text = [f"=== FILE: {f.get('name', 'document.pdf')} ==="]
        for idx, page in enumerate(reader.pages):
            file_text.append(f"--- Page {idx + 1} ---\n" + (page.extract_text() or ""))
        extracted_text.append("\n\n".join(file_text))

    return jsonify({"success": True, "text": "\n\n\n".join(extracted_text)})

# ── 4. Social Video Downloader: Info ──
@app.route('/api/video/info', methods=['POST', 'OPTIONS'])
def video_info():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    logger.info(f"Extracting info for URL: {url}")
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return jsonify({'error': 'Unable to retrieve media info'}), 400

            title = info.get('title', 'Unknown Media')
            duration = info.get('duration', 0)
            thumbnail = info.get('thumbnail')
            uploader = info.get('uploader') or info.get('channel') or 'Creator'
            description = info.get('description', '')
            if description and len(description) > 200:
                description = description[:200] + '...'

            direct_video_url = None
            formats = []

            for f in info.get('formats', []):
                vcodec = f.get('vcodec', 'none')
                acodec = f.get('acodec', 'none')
                height = f.get('height')
                ext = f.get('ext', '')
                filesize = f.get('filesize') or f.get('filesize_approx') or 0

                if vcodec != 'none' and acodec != 'none' and not direct_video_url:
                    if ext in ['mp4', 'webm'] and f.get('url'):
                        direct_video_url = f.get('url')

                if vcodec != 'none' and height:
                    formats.append({
                        'format_id': f.get('format_id'),
                        'type': 'video',
                        'resolution': f"{height}p",
                        'ext': ext,
                        'filesize_str': format_bytes(filesize) if filesize else "Adaptive",
                        'vcodec': vcodec,
                        'acodec': acodec
                    })

            formats.append({
                'format_id': 'bestaudio/best',
                'type': 'audio',
                'resolution': '320 kbps (HQ)',
                'ext': 'mp3',
                'filesize_str': 'High Quality Audio'
            })

            formats.append({
                'format_id': 'bestvideo+bestaudio/best',
                'type': 'video',
                'resolution': 'Best Available HD',
                'ext': 'mp4',
                'filesize_str': 'Full Resolution'
            })

            return jsonify({
                'success': True,
                'title': title,
                'duration': duration,
                'duration_str': format_duration(duration),
                'thumbnail': thumbnail,
                'uploader': uploader,
                'description': description,
                'direct_preview_url': direct_video_url,
                'webpage_url': info.get('webpage_url', url),
                'formats': formats
            })
    except Exception as e:
        logger.error(f"Error extracting video info: {e}")
        return jsonify({'error': f"Failed to inspect URL: {str(e)}"}), 500

# ── 5. Social Video Downloader: Download & Progress ──
def download_worker(job_id, url, format_id, extract_audio, audio_format):
    job_dir = DOWNLOADS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    with JOBS_LOCK:
        JOBS[job_id]['dir'] = str(job_dir)
        JOBS[job_id]['status'] = 'downloading'
        JOBS[job_id]['percent'] = 5

    def progress_hook(d):
        with JOBS_LOCK:
            if job_id not in JOBS:
                return
            if d.get('status') == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes') or 0
                speed = d.get('speed') or 0
                eta = d.get('eta') or 0

                percent = 10
                if total > 0:
                    percent = min(98, max(5, int((downloaded / total) * 100)))

                JOBS[job_id]['percent'] = percent
                JOBS[job_id]['speed'] = format_bytes(speed) + "/s" if speed else ""
                JOBS[job_id]['eta'] = f"{eta}s" if eta else ""
                JOBS[job_id]['status'] = 'downloading'
            elif d.get('status') == 'finished':
                JOBS[job_id]['percent'] = 99
                JOBS[job_id]['status'] = 'converting'

    out_template = str(job_dir / '%(title).100s.%(ext)s')

    ydl_opts = {
        'outtmpl': out_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }

    if extract_audio:
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': audio_format or 'mp3',
            'preferredquality': '320',
        }]
    else:
        if format_id:
            ydl_opts['format'] = format_id
        else:
            ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        files = list(job_dir.glob('*'))
        if not files:
            raise Exception("No file was created by download engine")

        output_file = max(files, key=lambda f: f.stat().st_size)

        with JOBS_LOCK:
            if job_id in JOBS:
                JOBS[job_id]['status'] = 'completed'
                JOBS[job_id]['percent'] = 100
                JOBS[job_id]['file_path'] = str(output_file)
                JOBS[job_id]['filename'] = output_file.name
                JOBS[job_id]['file_size'] = format_bytes(output_file.stat().st_size)
    except Exception as e:
        logger.error(f"Download worker error: {e}")
        with JOBS_LOCK:
            if job_id in JOBS:
                JOBS[job_id]['status'] = 'error'
                JOBS[job_id]['error'] = str(e)

@app.route('/api/video/download', methods=['POST', 'OPTIONS'])
def start_video_download():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()
    format_id = data.get('format_id')
    extract_audio = bool(data.get('extract_audio', False))
    audio_format = data.get('audio_format', 'mp3')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    job_id = str(uuid.uuid4())
    with JOBS_LOCK:
        JOBS[job_id] = {
            'id': job_id,
            'status': 'pending',
            'percent': 0,
            'speed': '',
            'eta': '',
            'filename': '',
            'file_path': '',
            'file_size': '',
            'error': None,
            'created_at': time.time()
        }

    t = threading.Thread(target=download_worker, args=(job_id, url, format_id, extract_audio, audio_format), daemon=True)
    t.start()
    return jsonify({'success': True, 'job_id': job_id})

@app.route('/api/video/progress/<job_id>', methods=['GET', 'OPTIONS'])
def get_video_progress(job_id):
    if request.method == 'OPTIONS':
        return ('', 204)
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        return jsonify(job)

@app.route('/api/video/file/<job_id>', methods=['GET'])
def download_video_file(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job or job.get('status') != 'completed':
            return jsonify({'error': 'File not ready or job not found'}), 404
        file_path = job.get('file_path')
        filename = job.get('filename')

    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File does not exist on disk'}), 404

    return send_file(file_path, as_attachment=True, download_name=filename)

# ── 6. Media: Video to Audio (FFmpeg) ──
@app.route('/api/media/video-to-audio', methods=['POST', 'OPTIONS'])
def video_to_audio():
    if request.method == 'OPTIONS':
        return ('', 204)
    if 'video_file' not in request.files:
        return jsonify({'error': 'No video_file uploaded'}), 400

    uploaded = request.files['video_file']
    audio_format = request.form.get('audio_format', 'mp3').lower()
    bitrate = request.form.get('bitrate', '320k')

    work_id = str(uuid.uuid4())
    temp_dir = DOWNLOADS_DIR / work_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    input_path = temp_dir / uploaded.filename
    uploaded.save(str(input_path))

    stem = Path(uploaded.filename).stem
    output_filename = f"{stem}_audio.{audio_format}"
    output_path = temp_dir / output_filename

    cmd = [
        'ffmpeg', '-y', '-i', str(input_path),
        '-vn', '-acodec', 'libmp3lame' if audio_format == 'mp3' else ('pcm_s16le' if audio_format == 'wav' else 'aac'),
        '-b:a', bitrate,
        str(output_path)
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        if res.returncode != 0:
            logger.error(f"FFmpeg error: {res.stderr.decode('utf-8', errors='ignore')}")
            return jsonify({'error': 'Audio conversion failed'}), 500

        return send_file(str(output_path), as_attachment=True, download_name=output_filename)
    except Exception as e:
        logger.error(f"video_to_audio exception: {e}")
        return jsonify({'error': str(e)}), 500

# ── 7. Media: Video Converter (FFmpeg) ──
@app.route('/api/media/convert-video', methods=['POST', 'OPTIONS'])
def convert_video():
    if request.method == 'OPTIONS':
        return ('', 204)
    if 'video_file' not in request.files:
        return jsonify({'error': 'No video_file uploaded'}), 400

    uploaded = request.files['video_file']
    target_format = request.form.get('target_format', 'mp4').lower()
    resolution = request.form.get('resolution', 'original')
    crf = request.form.get('crf', '23')

    work_id = str(uuid.uuid4())
    temp_dir = DOWNLOADS_DIR / work_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    input_path = temp_dir / uploaded.filename
    uploaded.save(str(input_path))

    stem = Path(uploaded.filename).stem
    output_filename = f"{stem}_converted.{target_format}"
    output_path = temp_dir / output_filename

    cmd = ['ffmpeg', '-y', '-i', str(input_path)]

    if resolution == '1080p':
        cmd += ['-vf', 'scale=-2:1080']
    elif resolution == '720p':
        cmd += ['-vf', 'scale=-2:720']
    elif resolution == '480p':
        cmd += ['-vf', 'scale=-2:480']

    if target_format == 'mp4':
        cmd += ['-c:v', 'libx264', '-crf', str(crf), '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k']
    elif target_format == 'webm':
        cmd += ['-c:v', 'libvpx-vp9', '-crf', str(crf), '-b:v', '0', '-c:a', 'libopus']
    elif target_format == 'mkv':
        cmd += ['-c:v', 'libx264', '-crf', str(crf), '-c:a', 'aac']

    cmd.append(str(output_path))

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
        if res.returncode != 0:
            logger.error(f"FFmpeg error: {res.stderr.decode('utf-8', errors='ignore')}")
            return jsonify({'error': 'Video conversion failed'}), 500

        return send_file(str(output_path), as_attachment=True, download_name=output_filename)
    except Exception as e:
        logger.error(f"convert_video exception: {e}")
        return jsonify({'error': str(e)}), 500

# ── 8. Office: Word Document Export ──
@app.route('/api/office/export-docx', methods=['POST', 'OPTIONS'])
def export_docx():
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json(silent=True) or {}
    filename = data.get('filename', 'document').strip()
    if not filename.endswith('.docx'):
        filename += '.docx'

    title = data.get('title', 'Document')
    html_content = data.get('html_content', '')
    content_blocks = data.get('content_blocks', [])

    doc = docx.Document()

    title_para = doc.add_paragraph()
    title_run = title_para.add_run(title)
    title_run.font.size = Pt(24)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(15, 23, 42)
    title_para.paragraph_format.space_after = Pt(14)

    if content_blocks:
        for block in content_blocks:
            b_type = block.get('type', 'paragraph')
            text = block.get('text', '')
            if b_type == 'h1':
                p = doc.add_heading(text, level=1)
                p.paragraph_format.space_before = Pt(12)
                p.paragraph_format.space_after = Pt(6)
            elif b_type == 'h2':
                p = doc.add_heading(text, level=2)
                p.paragraph_format.space_before = Pt(10)
                p.paragraph_format.space_after = Pt(4)
            elif b_type == 'h3':
                p = doc.add_heading(text, level=3)
                p.paragraph_format.space_before = Pt(8)
                p.paragraph_format.space_after = Pt(2)
            elif b_type == 'bullet':
                doc.add_paragraph(text, style='List Bullet')
            elif b_type == 'number':
                doc.add_paragraph(text, style='List Number')
            else:
                p = doc.add_paragraph(text)
                p.paragraph_format.space_after = Pt(6)
                p.paragraph_format.line_spacing = 1.15
    elif html_content:
        clean_text = re.sub(r'<br\s*/?>', '\n', html_content)
        clean_text = re.sub(r'</p>', '\n\n', clean_text)
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
        for line in lines:
            doc.add_paragraph(line)
    else:
        doc.add_paragraph("Created with ORBITA Studio.")

    mem_stream = io.BytesIO()
    doc.save(mem_stream)
    mem_stream.seek(0)

    return send_file(
        mem_stream,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

# ── 9. Office: Word Document Extract ──
@app.route('/api/office/extract-docx', methods=['POST', 'OPTIONS'])
def extract_docx():
    if request.method == 'OPTIONS':
        return ('', 204)
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    uploaded = request.files['file']
    doc = docx.Document(uploaded.stream)

    paragraphs = []
    for p in doc.paragraphs:
        if p.text.strip():
            paragraphs.append({
                'style': p.style.name if p.style else 'Normal',
                'text': p.text
            })

    full_text = "\n\n".join(p['text'] for p in paragraphs)
    return jsonify({
        'success': True,
        'filename': uploaded.filename,
        'paragraphs': paragraphs,
        'full_text': full_text
    })

# ── 10. Batch Image Converter to ZIP ──
@app.route('/api/image/batch-zip', methods=['POST', 'OPTIONS'])
def batch_image_zip():
    if request.method == 'OPTIONS':
        return ('', 204)
    files = request.files.getlist('images')
    if not files:
        return jsonify({'error': 'No images uploaded'}), 400

    target_format = request.form.get('target_format', 'png').lower()
    resize_factor = float(request.form.get('resize_factor', '100')) / 100.0
    quality = int(request.form.get('quality', '90'))

    work_id = str(uuid.uuid4())
    temp_dir = DOWNLOADS_DIR / work_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    converted_dir = temp_dir / "converted"
    converted_dir.mkdir(parents=True, exist_ok=True)

    fmt_ext_map = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp'}
    ext = fmt_ext_map.get(target_format, 'png')
    pil_format = 'JPEG' if ext == 'jpg' else ext.upper()

    for idx, f in enumerate(files):
        try:
            img = Image.open(f.stream)
            if pil_format == 'JPEG' and img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            if resize_factor != 1.0:
                new_w = max(1, int(img.width * resize_factor))
                new_h = max(1, int(img.height * resize_factor))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            orig_stem = Path(f.filename).stem or f"image_{idx+1}"
            out_file = converted_dir / f"{orig_stem}.{ext}"

            if pil_format == 'JPEG':
                img.save(str(out_file), format='JPEG', quality=quality)
            elif pil_format == 'WEBP':
                img.save(str(out_file), format='WEBP', quality=quality)
            else:
                img.save(str(out_file), format='PNG')
        except Exception as e:
            logger.error(f"Error processing image {f.filename}: {e}")

    zip_base = temp_dir / "orbita_batch_images"
    shutil.make_archive(str(zip_base), 'zip', str(converted_dir))
    zip_path = temp_dir / "orbita_batch_images.zip"

    return send_file(
        str(zip_path),
        as_attachment=True,
        download_name="orbita_batch_images.zip",
        mimetype="application/zip"
    )

if __name__ == '__main__':
    print(f"===========================================================")
    print(f"  ORBITA Studio Unified Engine Running on port {PORT}     ")
    print(f"  All media, document, and PDF operations fully active     ")
    print(f"===========================================================")
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
