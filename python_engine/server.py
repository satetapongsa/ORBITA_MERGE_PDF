import http.server
import socketserver
import json
import base64
import os
import io
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from PIL import Image

PORT = 5001

class ConverterHandler(http.server.BaseHTTPRequestHandler):
    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = {
            "status": "online",
            "service": "ORBITA Native Python Converter Engine",
            "version": "2.1.0",
            "capabilities": ["merge_pdf", "images_to_pdf", "split_pdf", "extract_text"]
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body.decode('utf-8'))
        except Exception as e:
            self.send_response(400)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}).encode('utf-8'))
            return

        action = self.path.strip("/")

        try:
            if action == "api/merge":
                self.handle_merge(data)
            elif action == "api/images-to-pdf":
                self.handle_images_to_pdf(data)
            elif action == "api/extract-text":
                self.handle_extract_text(data)
            else:
                self.send_response(404)
                self._set_cors()
                self.end_headers()
                self.wfile.write(b'{"error": "Endpoint not found"}')
        except Exception as e:
            self.send_response(500)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_merge(self, data):
        """
        data: {
          files: [{ id, name, base64 }],
          page_orders: [{ file_index, page_index, rotation }]
        }
        """
        files = data.get("files", [])
        page_orders = data.get("page_orders", [])

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

        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"success": True, "result_base64": out_base64}).encode('utf-8'))

    def handle_images_to_pdf(self, data):
        """
        data: {
          images: [{ name, base64 }]
        }
        """
        raw_images = data.get("images", [])
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

        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"success": True, "result_base64": out_base64}).encode('utf-8'))

    def handle_extract_text(self, data):
        """
        data: {
          files: [{ name, base64 }]
        }
        """
        files = data.get("files", [])
        extracted_text = []

        for f in files:
            pdf_bytes = base64.b64decode(f["base64"])
            reader = PdfReader(io.BytesIO(pdf_bytes))
            file_text = [f"=== FILE: {f['name']} ==="]
            for idx, page in enumerate(reader.pages):
                file_text.append(f"--- Page {idx + 1} ---\n" + page.extract_text())
            extracted_text.append("\n\n".join(file_text))

        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"success": True, "text": "\n\n\n".join(extracted_text)}).encode('utf-8'))

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ConverterHandler) as httpd:
        print(f"ORBITA Native Python Server running on port {PORT}")
        httpd.serve_forever()
