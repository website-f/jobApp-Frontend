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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { Card, EmptyState } from '../../components/ui';
import notificationService, { Notification } from '../../services/notificationService';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    job_match: 'briefcase',
    application_update: 'document-text',
    application_received: 'mail',
    message: 'chatbubble',
    system: 'notifications',
    reminder: 'alarm',
    profile_view: 'eye',
    job_expired: 'time',
    interview_scheduled: 'calendar',
};

const NOTIFICATION_COLORS: Record<string, string> = {
    job_match: '#0EA5E9',
    application_update: '#8B5CF6',
    application_received: '#10B981',
    message: '#22C55E',
    system: '#F59E0B',
    reminder: '#EC4899',
    profile_view: '#6366F1',
    job_expired: '#EF4444',
    interview_scheduled: '#14B8A6',
};

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        loadNotifications();
    }, []);

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
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
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
                setUnreadCount(prev => Math.max(0, prev - 1));
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
        if (notification.data) {
            if (notification.type === 'message' && notification.data.conversation_id) {
                navigation.navigate('Chat', { conversationId: notification.data.conversation_id });
            } else if (notification.type === 'application_update' && notification.data.application_id) {
                navigation.navigate('MyApplications');
            } else if (notification.type === 'application_received' && notification.data.job_id) {
                navigation.navigate('EmployerJobs');
            } else if (notification.type === 'job_match' && notification.data.job_id) {
                navigation.navigate('Jobs');
            }
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
