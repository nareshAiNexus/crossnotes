import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { ref, set, push, remove, onValue, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { database, storage, isFirebaseConfigured } from './firebase';
import type { Document } from '@/types/document';

// ... (existing interface and initDocumentDB)

// ... (existing IndexedDB functions: storePDFBlob, getPDFBlob, deletePDFBlob)

/**
 * Upload file blob to Firebase Storage
 */
export async function uploadFileToFirebase(userId: string, documentId: string, blob: Blob, fileName: string): Promise<string> {
    if (!storage || !isFirebaseConfigured()) {
        throw new Error('Firebase Storage is not configured');
    }

    const fileRef = storageRef(storage, `users/${userId}/documents/${documentId}_${fileName}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
}

/**
 * Get file blob from Firebase Storage
 */
export async function getFileFromFirebase(userId: string, documentId: string, fileName: string): Promise<Blob | null> {
    if (!storage || !isFirebaseConfigured()) {
        throw new Error('Firebase Storage is not configured');
    }

    try {
        const fileRef = storageRef(storage, `users/${userId}/documents/${documentId}_${fileName}`);
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        return await response.blob();
    } catch (error) {
        console.error('Error fetching file from Firebase:', error);
        // Fallback for legacy PDF-only uploads (try without filename suffix logic or just the old .pdf path)
        try {
            const legacyRef = storageRef(storage, `users/${userId}/documents/${documentId}.pdf`);
            const url = await getDownloadURL(legacyRef);
            const response = await fetch(url);
            return await response.blob();
        } catch (legacyError) {
            return null;
        }
    }
}

/**
 * Delete file from Firebase Storage
 */
export async function deleteFileFromFirebase(userId: string, documentId: string, fileName: string): Promise<void> {
    if (!storage || !isFirebaseConfigured()) {
        throw new Error('Firebase Storage is not configured');
    }

    try {
        const fileRef = storageRef(storage, `users/${userId}/documents/${documentId}_${fileName}`);
        await deleteObject(fileRef);
    } catch (error: any) {
        // Try deleting legacy path as well just in case
        try {
            const legacyRef = storageRef(storage, `users/${userId}/documents/${documentId}.pdf`);
            await deleteObject(legacyRef);
        } catch (e) {
            // Ignore
        }

        // Ignore if file doesn't exist
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

// ... (existing metadata functions)

interface DocumentStorageSchema extends DBSchema {
    documents: {
        key: string; // documentId
        value: {
            id: string;
            blob: Blob;
            uploadedAt: number;
        };
    };
}

let docDbPromise: Promise<IDBPDatabase<DocumentStorageSchema>> | null = null;

async function initDocumentDB() {
    if (!docDbPromise) {
        docDbPromise = openDB<DocumentStorageSchema>('crossnotes-documents', 1, {
            upgrade(db) {
                db.createObjectStore('documents', { keyPath: 'id' });
            },
        });
    }
    return docDbPromise;
}

/**
 * Store PDF blob in IndexedDB
 */
export async function storePDFBlob(documentId: string, blob: Blob): Promise<void> {
    const db = await initDocumentDB();
    await db.put('documents', {
        id: documentId,
        blob,
        uploadedAt: Date.now(),
    });
}

/**
 * Retrieve PDF blob from IndexedDB
 */
export async function getPDFBlob(documentId: string): Promise<Blob | null> {
    const db = await initDocumentDB();
    const doc = await db.get('documents', documentId);
    return doc?.blob || null;
}

/**
 * Delete PDF blob from IndexedDB
 */
export async function deletePDFBlob(documentId: string): Promise<void> {
    const db = await initDocumentDB();
    await db.delete('documents', documentId);
}

/**
 * Save document metadata to Firebase
 */
export async function saveDocumentMetadata(userId: string, document: Document): Promise<void> {
    if (!database || !isFirebaseConfigured()) {
        throw new Error('Firebase is not configured');
    }

    const docRef = ref(database, `users/${userId}/documents/${document.id}`);
    await set(docRef, document);
}

/**
 * Update document metadata in Firebase
 */
export async function updateDocumentMetadata(
    userId: string,
    documentId: string,
    updates: Partial<Document>
): Promise<void> {
    if (!database || !isFirebaseConfigured()) {
        throw new Error('Firebase is not configured');
    }

    const docRef = ref(database, `users/${userId}/documents/${documentId}`);
    await update(docRef, updates);
}

/**
 * Delete document metadata from Firebase
 */
export async function deleteDocumentMetadata(userId: string, documentId: string): Promise<void> {
    if (!database || !isFirebaseConfigured()) {
        throw new Error('Firebase is not configured');
    }

    const docRef = ref(database, `users/${userId}/documents/${documentId}`);
    await remove(docRef);
}

/**
 * Subscribe to document metadata changes
 */
export function subscribeToDocuments(
    userId: string,
    callback: (documents: Document[]) => void
): () => void {
    if (!database || !isFirebaseConfigured()) {
        callback([]);
        return () => { };
    }

    const docsRef = ref(database, `users/${userId}/documents`);

    const unsubscribe = onValue(docsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const documentsList = Object.entries(data).map(([id, doc]: [string, any]) => {
                const uploadedAt = typeof doc?.uploadedAt === 'number' ? doc.uploadedAt : Number(doc?.uploadedAt);
                return {
                    id,
                    ...doc,
                    uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
                };
            });
            callback(documentsList.sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0)));
        } else {
            callback([]);
        }
    });

    return unsubscribe;
}

/**
 * Generate a new document ID
 */
export function generateDocumentId(userId: string): string {
    if (!database || !isFirebaseConfigured()) {
        // Fallback to timestamp-based ID if Firebase is not configured
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const docsRef = ref(database, `users/${userId}/documents`);
    const newDocRef = push(docsRef);
    return newDocRef.key!;
}
