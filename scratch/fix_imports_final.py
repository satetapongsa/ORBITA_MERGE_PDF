import sys

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_imports = [
    'import React, { useState, useRef, useEffect } from "react";\n',
    'import { PDFDocument } from "pdf-lib";\n',
    'import * as pdfjs from "pdfjs-dist";\n',
    'import JSZip from "jszip";\n',
    'import mammoth from "mammoth";\n',
    'import * as XLSX from "xlsx";\n',
    'import { jsPDF } from "jspdf";\n',
    'import autoTable from "jspdf-autotable";\n',
    'import html2canvas from "html2canvas";\n',
    '\n',
    'import { supabase } from "./supabaseClient";\n'
]

# The first line should be the start of our new imports
# We need to find where the old lucide-react import starts to preserve it correctly.
# Currently lines 1 to 8 in the file are mangled.
# Let's just find the first line that has 'import {' and starts 'lucide-react' contents.
start_index = -1
for i, line in enumerate(lines):
    if 'import {' in line and ('FilePlus' in line or 'ShieldCheck' in line):
        start_index = i
        break

if start_index != -1:
    # Keep everything from start_index onwards, but prepend new_imports
    final_lines = new_imports + lines[start_index:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
