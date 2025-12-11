import api from './api';

// Types
export interface UserDocument {
    id: number;
    uuid: string;
    document_type: 'id' | 'certificate' | 'cover_letter' | 'portfolio' | 'other';
    title: string;
    description?: string;
    file_url: string;
    file_type: string;
    file_size: number;
    is_verified: boolean;
    verified_at?: string;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
}

export interface UploadDocumentData {
    document_type?: string;
    title?: string;
    description?: string;
}

// Document Service
export const documentService = {
    /**
     * Get all documents for current user
     */
    async getDocuments(): Promise<UserDocument[]> {
        const response = await api.get<UserDocument[]>('/documents/');
        return response.data;
    },

    /**
     * Upload a new document
     */
    async uploadDocument(file: FormData): Promise<UserDocument> {
        const response = await api.post<UserDocument>('/documents/upload/', file, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Get a specific document
     */
    async getDocument(uuid: string): Promise<UserDocument> {
        const response = await api.get<UserDocument>(`/documents/${uuid}/`);
        return response.data;
    },

    /**
     * Update document details
     */
    async updateDocument(uuid: string, data: UploadDocumentData): Promise<UserDocument> {
        const response = await api.put<UserDocument>(`/documents/${uuid}/`, data);
        return response.data;
    },

    /**
     * Delete a document
     */
    async deleteDocument(uuid: string): Promise<void> {
        await api.delete(`/documents/${uuid}/`);
    },
};

export default documentService;
