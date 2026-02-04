import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { ref, set, push, remove, onValue, update } from 'firebase/database';
import { database, isFirebaseConfigured } from './firebase';
import type { Document } from '@/types/document';

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
