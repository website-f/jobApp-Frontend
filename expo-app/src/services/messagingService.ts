import api from './api';

// Types
export interface Conversation {
    id: number;
    uuid: string;
    employer: {
        id: number;
        email: string;
        profile?: {
            first_name: string;
            last_name: string;
            company_name?: string;
        };
    };
    seeker: {
        id: number;
        email: string;
        profile?: {
            first_name: string;
            last_name: string;
        };
    };
    job?: {
        id: number;
        title: string;
        company_name: string;
    };
    job_application?: {
        id: number;
        status: string;
    };
    last_message_at: string;
    last_message_preview?: string;
    unread_count: number;
    is_active: boolean;
    created_at: string;
}

export interface Message {
    id: number;
    uuid: string;
    conversation: number;
    sender: {
        id: number;
        email: string;
        user_type: 'seeker' | 'employer';
    };
    message_type: 'text' | 'file' | 'system';
    content: string;
    file_url?: string;
    file_name?: string;
    is_read: boolean;
    created_at: string;
}

export interface SendMessageData {
    content: string;
    message_type?: 'text' | 'file';
    file_url?: string;
    file_name?: string;
}

// Messaging Service
export const messagingService = {
    /**
     * Get all conversations for the current user
     */
    async getConversations(): Promise<Conversation[]> {
        try {
            const response = await api.get('/messaging/conversations/');
            // Handle both paginated and non-paginated responses
            if (Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                return response.data.results;
            }
            return [];
        } catch (error: any) {
            console.error('getConversations error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get a single conversation by ID
     */
    async getConversation(conversationId: number): Promise<Conversation> {
        try {
            const response = await api.get(`/messaging/conversations/${conversationId}/`);
            return response.data;
        } catch (error: any) {
            console.error('getConversation error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: number): Promise<Message[]> {
        try {
            const response = await api.get(`/messaging/conversations/${conversationId}/messages/`);
            // Handle both paginated and non-paginated responses
            if (Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                return response.data.results;
            }
            return [];
        } catch (error: any) {
            console.error('getMessages error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Send a message in a conversation
     */
    async sendMessage(conversationId: number, data: SendMessageData): Promise<Message> {
        try {
            const response = await api.post(`/messaging/conversations/${conversationId}/send_message/`, data);
            return response.data;
        } catch (error: any) {
            console.error('sendMessage error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Start a new conversation (usually after applying for a job)
     */
    async startConversation(data: {
        employer_id: number;
        job_id?: number;
        job_application_id?: number;
        initial_message?: string;
    }): Promise<Conversation> {
        try {
            const response = await api.post('/messaging/conversations/', data);
            return response.data;
        } catch (error: any) {
            console.error('startConversation error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Mark messages as read in a conversation
     */
    async markAsRead(conversationId: number): Promise<void> {
        try {
            await api.post(`/messaging/conversations/${conversationId}/mark_read/`);
        } catch (error: any) {
            console.error('markAsRead error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get unread message count
     */
    async getUnreadCount(): Promise<number> {
        try {
            const response = await api.get('/messaging/conversations/unread_count/');
            return response.data.count || 0;
        } catch (error: any) {
            console.error('getUnreadCount error:', error.response?.data || error.message);
            return 0;
        }
    },

    /**
     * Get or create conversation with an employer for a specific job
     */
    async getOrCreateConversation(employerId: number, jobId?: number, applicationId?: number): Promise<Conversation> {
        try {
            const response = await api.post('/messaging/conversations/get_or_create/', {
                employer_id: employerId,
                job_id: jobId,
                job_application_id: applicationId,
            });
            return response.data;
        } catch (error: any) {
            console.error('getOrCreateConversation error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Start or get conversation with a seeker (for employers messaging candidates)
     * Uses the 'start' endpoint to create a new conversation with an initial message
     */
    async startConversationWithSeeker(seekerId: number, initialMessage: string, jobId?: number): Promise<Conversation> {
        try {
            const response = await api.post('/messaging/conversations/start/', {
                recipient_id: seekerId,
                job_id: jobId,
                initial_message: initialMessage,
            });
            return response.data;
        } catch (error: any) {
            console.error('startConversationWithSeeker error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get or create conversation with a seeker (for employers)
     */
    async getOrCreateConversationWithSeeker(seekerId: number, jobId?: number): Promise<Conversation> {
        try {
            const response = await api.post('/messaging/conversations/get_or_create/', {
                employer_id: 0, // Will be set by backend from request.user
                seeker_id: seekerId,
                job_id: jobId,
            });
            return response.data;
        } catch (error: any) {
            console.error('getOrCreateConversationWithSeeker error:', error.response?.data || error.message);
            throw error;
        }
    },
};

export default messagingService;
