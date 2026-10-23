"""
ORBITA Native Python Converter Engine (No external third-party API dependencies)
Built for local high-speed document manipulation, merging, splitting, and conversions.
"""

import sys
import io
import json
import base64
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from PIL import Image

def merge_pdfs(pdf_paths, output_path, page_orders=None):
    """
    Merge multiple PDF files into one.
    page_orders: list of dicts [{'file_index': int, 'page_index': int, 'rotation': int}]
    """
    writer = PdfWriter()
    readers = [PdfReader(p) for p in pdf_paths]

    if page_orders:
        for item in page_orders:
            f_idx = item['file_index']
            p_idx = item['page_index']
            rot = item.get('rotation', 0)
            page = readers[f_idx].pages[p_idx]
            if rot:
                page.rotate(rot)
            writer.add_page(page)
    else:
        for reader in readers:
            for page in reader.pages:
                writer.add_page(page)

    with open(output_path, "wb") as out_file:
        writer.write(out_file)
    return output_path

def images_to_pdf(image_paths, output_path):
    """
    Convert a list of images (PNG, JPG, WEBP) directly into a PDF.
    """
    images = []
    for img_path in image_paths:
        img = Image.open(img_path)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        images.append(img)

    if images:
        images[0].save(output_path, save_all=True, append_images=images[1:], resolution=300.0)
    return output_path

def split_pdf(pdf_path, output_dir):
    """
    Split a multi-page PDF into separate single-page PDF files.
    """
    reader = PdfReader(pdf_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    created_files = []

    for i, page in enumerate(reader.pages):
        writer = PdfWriter()
        writer.add_page(page)
        out_file = out_dir / f"page_{i + 1:03d}.pdf"
        with open(out_file, "wb") as f:
            writer.write(f)
        created_files.append(str(out_file))

    return created_files

def extract_text(pdf_path):
    """
    Extract all textual content from a PDF.
    """
    reader = PdfReader(pdf_path)
    text_data = []
    for idx, page in enumerate(reader.pages):
        text_data.append(f"--- Page {idx + 1} ---\n" + page.extract_text())
    return "\n\n".join(text_data)

if __name__ == "__main__":
    print("ORBITA Native Python Converter Engine loaded.")
