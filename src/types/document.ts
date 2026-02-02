export interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: number;
    pageCount?: number;
    folderId: string | null;
    // Storage reference (IndexedDB key for the PDF blob)
    storageRef: string;
    // Processing status
    status: 'uploading' | 'processing' | 'indexed' | 'error';
    errorMessage?: string;
}

export interface PageText {
    pageNumber: number;
    text: string;
}

export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    pages: PageText[];
}
