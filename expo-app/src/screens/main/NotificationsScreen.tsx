import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useBadgeStore, spacing, typography, borderRadius } from '../../store';
import { Card, EmptyState } from '../../components/ui';
import notificationService, { Notification } from '../../services/notificationService';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    // Job related
    job_match: 'briefcase',
    job_expired: 'time',
    job_reminder: 'alarm',
    // Application related
    application_update: 'document-text',
    application_received: 'mail',
    contract_generated: 'document-attach',
    contract_acknowledged: 'checkmark-done',
    // Work session related
    work_report_to_work: 'walk',
    work_clock_in: 'log-in',
    work_clock_out: 'log-out',
    work_break: 'cafe',
    work_completed: 'checkmark-circle',
    work_confirmed: 'shield-checkmark',
    // Payment related
    payment_pending: 'hourglass',
    payment_received: 'wallet',
    withdrawal_processed: 'cash',
    // Messaging
    message: 'chatbubble',
    // Rating
    rating_received: 'star',
    rating_reminder: 'star-half',
    // Penalty
    penalty_issued: 'warning',
    penalty_appeal: 'megaphone',
    // General
    system: 'notifications',
    reminder: 'alarm',
    profile_view: 'eye',
    interview_scheduled: 'calendar',
};

const NOTIFICATION_COLORS: Record<string, string> = {
    // Job related
    job_match: '#0EA5E9',
    job_expired: '#EF4444',
    job_reminder: '#F59E0B',
    // Application related
    application_update: '#8B5CF6',
    application_received: '#10B981',
    contract_generated: '#6366F1',
    contract_acknowledged: '#10B981',
    // Work session related
    work_report_to_work: '#3B82F6',
    work_clock_in: '#22C55E',
    work_clock_out: '#F97316',
    work_break: '#A855F7',
    work_completed: '#10B981',
    work_confirmed: '#059669',
    // Payment related
    payment_pending: '#F59E0B',
    payment_received: '#10B981',
    withdrawal_processed: '#22C55E',
    // Messaging
    message: '#22C55E',
    // Rating
    rating_received: '#F59E0B',
    rating_reminder: '#F59E0B',
    // Penalty
    penalty_issued: '#EF4444',
    penalty_appeal: '#F97316',
    // General
    system: '#F59E0B',
    reminder: '#EC4899',
    profile_view: '#6366F1',
    interview_scheduled: '#14B8A6',
};

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { fetchBadgeCounts, setUnreadNotifications } = useBadgeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    // Refresh badge counts when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadNotifications();
            fetchBadgeCounts();
        }, [])
    );

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationService.getNotifications(1, 50);
            setNotifications(response.notifications);
            setUnreadCount(response.unread_count);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            ));
            const newCount = Math.max(0, unreadCount - 1);
            setUnreadCount(newCount);
            setUnreadNotifications(newCount);
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            setUnreadNotifications(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await notificationService.deleteNotification(id);
            const notification = notifications.find(n => n.id === id);
            setNotifications(notifications.filter(n => n.id !== id));
            if (notification && !notification.read) {
                const newCount = Math.max(0, unreadCount - 1);
                setUnreadCount(newCount);
                setUnreadNotifications(newCount);
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationPress = (notification: Notification) => {
        // Mark as read first
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type and data
        const { type, data } = notification;

        // Message notifications
        if (type === 'message' && data?.conversation_id) {
            navigation.navigate('Chat', { conversationId: data.conversation_id });
            return;
        }

        // Application related - seeker side
        if (type === 'application_update' && data?.application_id) {
            navigation.navigate('MyApplications');
            return;
        }

        // Contract related - seeker side
        if ((type === 'contract_generated' || type === 'contract_acknowledged') && data?.application_id) {
            navigation.navigate('MyApplications');
            return;
        }

        // Application received - employer side
        if (type === 'application_received' && data?.job_id) {
            navigation.navigate('EmployerJobs');
            return;
        }

        // Job match - navigate to jobs
        if ((type === 'job_match' || type === 'job_expired' || type === 'job_reminder') && data?.job_id) {
            navigation.navigate('Jobs');
            return;
        }

        // Work session related notifications - go to clock in/out
        if (
            type === 'work_report_to_work' ||
            type === 'work_clock_in' ||
            type === 'work_clock_out' ||
            type === 'work_break' ||
            type === 'work_completed' ||
            type === 'work_confirmed'
        ) {
            navigation.navigate('ClockInOut');
            return;
        }

        // Payment related - go to earnings/wallet
        if (type === 'payment_pending' || type === 'payment_received' || type === 'withdrawal_processed') {
            navigation.navigate('Earnings');
            return;
        }

        // Rating received - go to profile
        if (type === 'rating_received' || type === 'rating_reminder') {
            navigation.navigate('Profile');
            return;
        }

        // Penalty notifications - go to profile/settings
        if (type === 'penalty_issued' || type === 'penalty_appeal') {
            navigation.navigate('Profile');
            return;
        }

        // Interview scheduled - go to applications
        if (type === 'interview_scheduled' && data?.application_id) {
            navigation.navigate('MyApplications');
            return;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                    </View>
                    <View style={styles.markAllButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                    {unreadCount > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                        <Ionicons name="checkmark-done" size={22} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={[styles.filterRow, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    style={[
                        styles.filterTab,
                        filter === 'all' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[
                        styles.filterTabText,
                        { color: filter === 'all' ? '#fff' : colors.textMuted }
                    ]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.filterTab,
                        filter === 'unread' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFilter('unread')}
                >
                    <Text style={[
                        styles.filterTabText,
                        { color: filter === 'unread' ? '#fff' : colors.textMuted }
                    ]}>
                        Unread ({unreadCount})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {filteredNotifications.length === 0 ? (
                    <Card variant="default" style={styles.emptyCard}>
                        <EmptyState
                            icon="notifications-off-outline"
                            title={filter === 'unread' ? "All caught up!" : "No notifications yet"}
                            description={filter === 'unread'
                                ? "You've read all your notifications"
                                : "You'll see notifications about job matches, messages, and updates here"
                            }
                        />
                    </Card>
                ) : (
                    filteredNotifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[
                                styles.notificationCard,
                                {
                                    backgroundColor: notification.read ? colors.surface : colors.primaryLight,
                                    borderColor: notification.read ? colors.border : colors.primary + '30',
                                }
                            ]}
                            onPress={() => handleNotificationPress(notification)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconContainer,
                                { backgroundColor: (NOTIFICATION_COLORS[notification.type] || '#6B7280') + '20' }
                            ]}>
                                <Ionicons
                                    name={NOTIFICATION_ICONS[notification.type] || 'notifications'}
                                    size={20}
                                    color={NOTIFICATION_COLORS[notification.type] || '#6B7280'}
                                />
                            </View>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text
                                        style={[
                                            styles.notificationTitle,
                                            {
                                                color: colors.text,
                                                fontWeight: notification.read ? '500' : '700',
                                            }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {notification.title}
                                    </Text>
                                    {!notification.read && (
                                        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                                    )}
                                </View>
                                <Text
                                    style={[styles.notificationMessage, { color: colors.textSecondary }]}
                                    numberOfLines={2}
                                >
                                    {notification.message}
                                </Text>
                                <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
                                    {formatTime(notification.created_at)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deleteNotification(notification.id)}
                            >
                                <Ionicons name="close" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: typography.fontWeight.bold as any,
    },
    markAllButton: {
        width: 40,
        alignItems: 'flex-end',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterRow: {
        flexDirection: 'row',
        padding: spacing.sm,
        gap: spacing.sm,
    },
    filterTab: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    filterTabText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    scrollContent: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    emptyCard: {
        marginTop: spacing.xl,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    notificationTitle: {
        fontSize: typography.fontSize.sm,
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    notificationMessage: {
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
        marginTop: 2,
    },
    notificationTime: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
    deleteButton: {
        padding: spacing.xs,
    },
});
