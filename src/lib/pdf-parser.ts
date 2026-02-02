import * as pdfjsLib from 'pdfjs-dist';
import type { PDFExtractionResult, PageText } from '@/types/document';

// Configure PDF.js worker
// Using CDN for the worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file
 * @param file - The PDF file to extract text from
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Extracted text, page count, and per-page text
 */
export async function extractTextFromPDF(
    file: File,
    onProgress?: (progress: number) => void
): Promise<PDFExtractionResult> {
    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        onProgress?.(10);
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const pageCount = pdf.numPages;
        const pages: PageText[] = [];
        let allText = '';

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Combine text items with spaces
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
                .trim();

            pages.push({
                pageNumber: pageNum,
                text: pageText,
            });

            allText += pageText + '\n\n';

            // Update progress
            const progress = 10 + Math.floor((pageNum / pageCount) * 90);
            onProgress?.(progress);
        }

        return {
            text: allText.trim(),
            pageCount,
            pages,
        };
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validate if a file is a valid PDF
 * @param file - The file to validate
 * @returns True if valid PDF, false otherwise
 */
export function isValidPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Validate file size (default max 10MB)
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns True if file size is within limit
 */
export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
