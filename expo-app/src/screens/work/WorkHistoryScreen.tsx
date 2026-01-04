import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import workService, { WorkSession } from '../../services/workService';

export default function WorkHistoryScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workHistory, setWorkHistory] = useState<WorkSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

    const fetchData = useCallback(async () => {
        try {
            const history = await workService.getWorkHistory();
            setWorkHistory(history);
        } catch (error) {
            console.error('Error fetching work history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}m`;
        return `${hours}h ${mins}m`;
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return colors.success;
            case 'on_break': return colors.warning;
            case 'completed': return colors.primary;
            default: return colors.textMuted;
        }
    };

    const filteredHistory = workHistory.filter(session => {
        if (filter === 'all') return true;
        if (filter === 'completed') return session.status === 'completed';
        if (filter === 'active') return session.status === 'active' || session.status === 'on_break';
        return true;
    });

    const totalEarnings = workHistory
        .filter(s => s.total_earnings)
        .reduce((sum, s) => sum + Number(s.total_earnings || 0), 0);

    const totalHours = workHistory
        .filter(s => s.total_work_minutes)
        .reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{
                    flex: 1,
                    fontSize: typography.fontSize.xl,
                    fontWeight: '700',
                    color: colors.text,
                    marginLeft: spacing.md
                }}>
                    {t('work.workHistory')}
                </Text>
            </View>

            {/* Summary Stats */}
            <View style={{
                flexDirection: 'row',
                gap: spacing.sm,
                padding: spacing.base,
                borderBottomWidth: 1,
                borderBottomColor: colors.border
            }}>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md
                }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.8)' }}>
                        Total Hours
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: '#fff' }}>
                        {formatDuration(totalHours)}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.success,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md
                }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.8)' }}>
                        Total Earnings
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: '#fff' }}>
                        RM {totalEarnings.toFixed(2)}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.cardBorder
                }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        Sessions
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                        {workHistory.length}
                    </Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.sm,
                gap: spacing.sm
            }}>
                {(['all', 'completed', 'active'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: borderRadius.base,
                            backgroundColor: filter === f ? colors.primary : colors.card,
                            borderWidth: 1,
                            borderColor: filter === f ? colors.primary : colors.cardBorder
                        }}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: '600',
                            color: filter === f ? '#fff' : colors.text,
                            textTransform: 'capitalize'
                        }}>
                            {f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {filteredHistory.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="time-outline" size={64} color={colors.textMuted} />
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '600',
                            color: colors.text,
                            marginTop: spacing.md
                        }}>
                            No Work History
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.sm
                        }}>
                            Your completed work sessions will appear here
                        </Text>
                    </View>
                ) : (
                    filteredHistory.map((session) => (
                        <TouchableOpacity
                            key={session.id}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.md,
                                borderWidth: 1,
                                borderColor: colors.cardBorder
                            }}
                            onPress={() => {
                                setSelectedSession(session);
                                setShowDetailModal(true);
                            }}
                        >
                            {/* Header Row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '700',
                                        color: colors.text
                                    }}>
                                        {session.job_title}
                                    </Text>
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.textSecondary
                                    }}>
                                        {session.company_name}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: `${getStatusColor(session.status)}20`,
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: spacing.xs,
                                    borderRadius: borderRadius.base
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.xs,
                                        fontWeight: '600',
                                        color: getStatusColor(session.status),
                                        textTransform: 'capitalize'
                                    }}>
                                        {session.status.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Time Info */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                backgroundColor: colors.background,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                marginBottom: spacing.md
                            }}>
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Date
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text }}>
                                        {formatDate(session.clock_in_time)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Clock In
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text }}>
                                        {formatTime(session.clock_in_time)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Clock Out
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text }}>
                                        {session.clock_out_time ? formatTime(session.clock_out_time) : '-'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Duration
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.primary }}>
                                        {session.total_work_minutes ? formatDuration(session.total_work_minutes) : '-'}
                                    </Text>
                                </View>
                            </View>

                            {/* Earnings */}
                            {session.total_earnings && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {session.clock_in_verified && session.clock_out_verified ? (
                                            <>
                                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.success, marginLeft: 4 }}>
                                                    Verified
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="warning" size={16} color={colors.warning} />
                                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning, marginLeft: 4 }}>
                                                    Pending Review
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                    <Text style={{
                                        fontSize: typography.fontSize.lg,
                                        fontWeight: '700',
                                        color: colors.success
                                    }}>
                                        RM {Number(session.total_earnings).toFixed(2)}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end'
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: borderRadius.xl,
                        borderTopRightRadius: borderRadius.xl,
                        padding: spacing.lg,
                        maxHeight: '80%'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                Session Details
                            </Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedSession && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Job Info */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    marginBottom: spacing.md,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.lg,
                                        fontWeight: '700',
                                        color: colors.text,
                                        marginBottom: spacing.xs
                                    }}>
                                        {selectedSession.job_title}
                                    </Text>
                                    <Text style={{
                                        fontSize: typography.fontSize.base,
                                        color: colors.textSecondary
                                    }}>
                                        {selectedSession.company_name}
                                    </Text>
                                </View>

                                {/* Time Details */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    marginBottom: spacing.md,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '700',
                                        color: colors.text,
                                        marginBottom: spacing.md
                                    }}>
                                        Time Details
                                    </Text>
                                    <View style={{ gap: spacing.sm }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: colors.textSecondary }}>Clock In</Text>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontWeight: '600', color: colors.text }}>
                                                    {formatTime(selectedSession.clock_in_time)}
                                                </Text>
                                                {selectedSession.clock_in_verified ? (
                                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.success }}>
                                                        Verified at location
                                                    </Text>
                                                ) : (
                                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning }}>
                                                        {selectedSession.clock_in_distance_meters}m from site
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        {selectedSession.clock_out_time && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: colors.textSecondary }}>Clock Out</Text>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ fontWeight: '600', color: colors.text }}>
                                                        {formatTime(selectedSession.clock_out_time)}
                                                    </Text>
                                                    {selectedSession.clock_out_verified ? (
                                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.success }}>
                                                            Verified at location
                                                        </Text>
                                                    ) : (
                                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning }}>
                                                            {selectedSession.clock_out_distance_meters}m from site
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: colors.textSecondary }}>Total Work Time</Text>
                                            <Text style={{ fontWeight: '700', color: colors.primary }}>
                                                {selectedSession.total_work_minutes ? formatDuration(selectedSession.total_work_minutes) : '-'}
                                            </Text>
                                        </View>
                                        {selectedSession.total_break_minutes > 0 && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: colors.textSecondary }}>Break Time</Text>
                                                <Text style={{ fontWeight: '600', color: colors.text }}>
                                                    {formatDuration(selectedSession.total_break_minutes)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Earnings */}
                                {selectedSession.total_earnings && (
                                    <View style={{
                                        backgroundColor: colors.successLight,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.lg,
                                        marginBottom: spacing.md,
                                        borderWidth: 1,
                                        borderColor: colors.success
                                    }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '700',
                                            color: colors.success,
                                            marginBottom: spacing.md
                                        }}>
                                            Earnings
                                        </Text>
                                        <View style={{ gap: spacing.sm }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: colors.text }}>Hourly Rate</Text>
                                                <Text style={{ fontWeight: '600', color: colors.text }}>
                                                    RM {Number(selectedSession.hourly_rate).toFixed(2)}/hr
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: colors.text }}>Total Earnings</Text>
                                                <Text style={{ fontWeight: '700', fontSize: typography.fontSize.lg, color: colors.success }}>
                                                    RM {Number(selectedSession.total_earnings).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Notes */}
                                {selectedSession.notes && (
                                    <View style={{
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.lg,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder
                                    }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '700',
                                            color: colors.text,
                                            marginBottom: spacing.sm
                                        }}>
                                            Notes
                                        </Text>
                                        <Text style={{ color: colors.textSecondary }}>
                                            {selectedSession.notes}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
