import { create } from 'zustand';
import { messagingService } from '../services/messagingService';
import notificationService from '../services/notificationService';

interface BadgeState {
    unreadMessages: number;
    unreadNotifications: number;
    isLoading: boolean;

    // Actions
    fetchBadgeCounts: () => Promise<void>;
    setUnreadMessages: (count: number) => void;
    setUnreadNotifications: (count: number) => void;
    clearMessageBadge: () => void;
    clearNotificationBadge: () => void;
    decrementMessageBadge: () => void;
    decrementNotificationBadge: () => void;
}

export const useBadgeStore = create<BadgeState>()((set, get) => ({
    unreadMessages: 0,
    unreadNotifications: 0,
    isLoading: false,

    fetchBadgeCounts: async () => {
        set({ isLoading: true });
        try {
            const [messagesCount, notificationsCount] = await Promise.all([
                messagingService.getUnreadCount(),
                notificationService.getUnreadCount(),
            ]);
            set({
                unreadMessages: messagesCount,
                unreadNotifications: notificationsCount,
            });
        } catch (error) {
            console.error('Failed to fetch badge counts:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    setUnreadMessages: (count) => set({ unreadMessages: count }),
    setUnreadNotifications: (count) => set({ unreadNotifications: count }),

    clearMessageBadge: () => set({ unreadMessages: 0 }),
    clearNotificationBadge: () => set({ unreadNotifications: 0 }),

    decrementMessageBadge: () => set((state) => ({
        unreadMessages: Math.max(0, state.unreadMessages - 1),
    })),

    decrementNotificationBadge: () => set((state) => ({
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    })),
}));

export default useBadgeStore;
