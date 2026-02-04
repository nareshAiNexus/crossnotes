export interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    /**
     * High-level type used for parsing/indexing. Kept to match existing Firebase rules.
     */
    fileType: 'pdf' | 'text' | 'docx' | 'pptx';
    uploadedAt: number;
    pageCount?: number;
    folderId: string | null;

    /**
     * Storage path kept to match existing Firebase rules. In this app we store blobs in IndexedDB.
     */
    storagePath: string;

    // Storage reference (IndexedDB key for the blob)
    storageRef: string;

    /**
     * Convenience boolean used by rules/UI.
     */
    indexed: boolean;

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
