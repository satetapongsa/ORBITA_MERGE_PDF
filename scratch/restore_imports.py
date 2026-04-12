import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { supabase } from './supabaseClient';
import { 
  FilePlus, ArrowLeft, Download, Trash2, GripVertical, 
  Layers, Move, Loader2, CheckCircle2, AlertCircle, FolderArchive, 
  FileImage, FileText, FileSpreadsheet, Globe, Zap, ShieldCheck, Sparkles, Wand2, 
  Presentation, X, LogIn, LogOut, User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@nd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
