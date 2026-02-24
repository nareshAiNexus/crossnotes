import JSZip from 'jszip';
import type { PageText, PDFExtractionResult } from '@/types/document';
import { extractTextFromPDF } from '@/lib/pdf-parser';

export type SupportedFileType = 'pdf' | 'text' | 'docx' | 'pptx' | 'zip';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const ZIP_MIME = 'application/zip';
const ZIP_X_MIME = 'application/x-zip-compressed';

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function detectFileType(file: File): SupportedFileType | null {
  const e = ext(file.name);

  if (file.type === 'application/pdf' || e === 'pdf') return 'pdf';
  if (file.type === DOCX_MIME || e === 'docx') return 'docx';
  if (file.type === PPTX_MIME || e === 'pptx') return 'pptx';
  if (file.type === ZIP_MIME || file.type === ZIP_X_MIME || e === 'zip') return 'zip';

  // Text-like files (many browsers use application/octet-stream for unknown extensions)
  if (file.type.startsWith('text/')) return 'text';
  if (['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'yaml', 'yml', 'rtf', 'html', 'htm', 'xml', 'ini', 'cfg'].includes(e)) return 'text';

  return null;
}

export function isSupportedDocumentFile(file: File): boolean {
  return detectFileType(file) !== null;
}

function parseXml(xmlText: string): Document {
  return new DOMParser().parseFromString(xmlText, 'application/xml');
}

function textFromNodes(doc: Document, selector: string): string[] {
  return Array.from(doc.querySelectorAll(selector))
    .map((n) => n.textContent ?? '')
    .map((t) => t.replace(/\s+/g, ' '))
    .map((t) => t.trim())
    .filter(Boolean);
}

async function extractTextFromDocx(file: File, onProgress?: (progress: number) => void): Promise<PDFExtractionResult> {
  onProgress?.(10);
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  onProgress?.(40);

  const documentXml = await zip.file('word/document.xml')?.async('text');
  if (!documentXml) {
    throw new Error('Invalid .docx: missing word/document.xml');
  }

  const doc = parseXml(documentXml);
  // Prefer paragraph grouping; fall back to all text runs
  const paragraphs = Array.from(doc.querySelectorAll('w\\:p'))
    .map((p) => {
      const runs = Array.from(p.querySelectorAll('w\\:t'))
        .map((n) => n.textContent ?? '')
        .join('');
      return runs.replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);

  const text = (paragraphs.length > 0 ? paragraphs : textFromNodes(doc, 'w\\:t')).join('\n');
  onProgress?.(100);

  return {
    text,
    pageCount: 1,
    pages: [{ pageNumber: 1, text }],
  };
}

function slideNumberFromPath(path: string): number {
  const m = path.match(/slide(\d+)\.xml$/i);
  return m ? Number(m[1]) : 0;
}

async function extractTextFromPptx(file: File, onProgress?: (progress: number) => void): Promise<PDFExtractionResult> {
  onProgress?.(10);
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  onProgress?.(30);

  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => slideNumberFromPath(a) - slideNumberFromPath(b));

  if (slidePaths.length === 0) {
    throw new Error('Invalid .pptx: no slides found');
  }

  const pages: PageText[] = [];
  let allText = '';

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    const xml = await zip.file(slidePath)?.async('text');
    if (!xml) continue;

    const doc = parseXml(xml);
    const parts = textFromNodes(doc, 'a\\:t');
    const slideText = parts.join(' ').trim();

    pages.push({ pageNumber: i + 1, text: slideText });
    allText += slideText + '\n\n';

    onProgress?.(30 + Math.floor(((i + 1) / slidePaths.length) * 70));
  }

  return {
    text: allText.trim(),
    pageCount: pages.length,
    pages,
  };
}

async function extractTextFromPlainText(file: File): Promise<PDFExtractionResult> {
  const text = (await file.text()).trim();
  return {
    text,
    pageCount: 1,
    pages: [{ pageNumber: 1, text }],
  };
}

export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: number) => void,
  options?: { maxPages?: number }
): Promise<{ fileType: SupportedFileType; extraction: PDFExtractionResult }> {
  const fileType = detectFileType(file);
  if (!fileType) {
    throw new Error('Unsupported file type');
  }

  if (fileType === 'pdf') {
    const extraction = await extractTextFromPDF(file, onProgress, options?.maxPages);
    return { fileType, extraction };
  }

  if (fileType === 'docx') {
    const extraction = await extractTextFromDocx(file, onProgress);
    return { fileType, extraction };
  }

  if (fileType === 'pptx') {
    const extraction = await extractTextFromPptx(file, onProgress);
    return { fileType, extraction };
  }

  if (fileType === 'zip') {
    // No text extraction for ZIP files yet
    return {
      fileType,
      extraction: {
        text: '',
        pageCount: 0,
        pages: []
      }
    };
  }

  const extraction = await extractTextFromPlainText(file);
  return { fileType, extraction };
}

export function supportedAcceptString(): string {
  return [
    '.pdf',
    '.txt',
    '.md',
    '.markdown',
    '.csv',
    '.tsv',
    '.json',
    '.log',
    '.yaml',
    '.yml',
    '.docx',
    '.pptx',
    '.rtf',
    '.html',
    '.htm',
    '.xml',
    '.ini',
    '.cfg',
    '.zip',
  ].join(',');
}
