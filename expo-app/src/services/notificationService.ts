import api from './api';

export interface Notification {
    id: number;
    type: 'job_match' | 'application_update' | 'message' | 'system' | 'reminder' | 'profile_view';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    data?: {
        job_id?: number;
        application_id?: number;
        conversation_id?: number;
        employer_id?: string;
        seeker_id?: string;
    };
}

export interface NotificationResponse {
    notifications: Notification[];
    unread_count: number;
    total_count: number;
}

export const notificationService = {
    /**
     * Get all notifications for the current user
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationResponse> {
        try {
            const response = await api.get<NotificationResponse>('/notifications/', {
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            // Return empty response if endpoint doesn't exist yet
            console.log('Notifications endpoint not available, using local data');
            return {
                notifications: [],
                unread_count: 0,
                total_count: 0
            };
        }
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        try {
            const response = await api.get<{ count: number }>('/notifications/unread-count/');
            return response.data.count;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: number): Promise<void> {
        try {
            await api.post(`/notifications/${notificationId}/read/`);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        try {
            await api.post('/notifications/mark-all-read/');
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    },

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: number): Promise<void> {
        try {
            await api.delete(`/notifications/${notificationId}/`);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    },

    /**
     * Clear all notifications
     */
    async clearAll(): Promise<void> {
        try {
            await api.delete('/notifications/clear-all/');
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    },
};

export default notificationService;
