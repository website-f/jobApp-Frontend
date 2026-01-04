import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import workService, { WorkSession } from '../../services/workService';
import jobService from '../../services/jobService';

export default function ClockInOutScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
    const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [workHistory, setWorkHistory] = useState<WorkSession[]>([]);

    const fetchData = useCallback(async () => {
        try {
            // Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
            }

            // Get active session
            const session = await workService.getActiveSession();
            setActiveSession(session);

            // Get accepted jobs (for clock in)
            const applications = await jobService.getMyApplications();
            const accepted = applications.filter((app: any) => app.status === 'accepted');
            setUpcomingJobs(accepted.slice(0, 5));

            // Get work history
            const history = await workService.getWorkHistory();
            setWorkHistory(history.slice(0, 10));

        } catch (error) {
            console.error('Error fetching data:', error);
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

    const handleClockIn = async (applicationId: number) => {
        if (!currentLocation) {
            Alert.alert('Location Required', 'Please enable location services to clock in.');
            return;
        }

        setProcessing(true);
        try {
            const result = await workService.clockIn({
                application_id: applicationId,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
            });

            if (result.success) {
                setActiveSession(result.session);
                Alert.alert(
                    result.is_within_geofence ? 'Clocked In!' : 'Clocked In (Outside Geofence)',
                    result.message
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to clock in');
        } finally {
            setProcessing(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeSession || !currentLocation) return;

        Alert.alert(
            'Clock Out',
            'Are you sure you want to clock out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clock Out',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const result = await workService.clockOut({
                                session_id: activeSession.id,
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude
                            });

                            if (result.success) {
                                setActiveSession(null);
                                Alert.alert(
                                    'Clocked Out!',
                                    `Total hours: ${result.total_hours}\nEarnings: RM ${result.total_earnings.toFixed(2)}`
                                );
                                fetchData();
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error?.response?.data?.error || 'Failed to clock out');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleStartBreak = async (breakType: string) => {
        if (!activeSession) return;

        setProcessing(true);
        try {
            await workService.startBreak(activeSession.id, breakType);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to start break');
        } finally {
            setProcessing(false);
        }
    };

    const handleEndBreak = async () => {
        if (!activeSession) return;

        setProcessing(true);
        try {
            await workService.endBreak(activeSession.id);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to end break');
        } finally {
            setProcessing(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

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
                    {t('work.clockIn')} / {t('work.clockOut')}
                </Text>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {/* Active Session Card */}
                {activeSession && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                        borderWidth: 2,
                        borderColor: activeSession.status === 'on_break' ? colors.warning : colors.success
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                            <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: activeSession.status === 'on_break' ? colors.warning : colors.success,
                                marginRight: spacing.sm
                            }} />
                            <Text style={{
                                fontSize: typography.fontSize.sm,
                                fontWeight: '600',
                                color: activeSession.status === 'on_break' ? colors.warning : colors.success,
                                textTransform: 'uppercase'
                            }}>
                                {activeSession.status === 'on_break' ? t('work.onBreak') : t('work.activeSession')}
                            </Text>
                        </View>

                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: spacing.xs
                        }}>
                            {activeSession.job_title}
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            marginBottom: spacing.md
                        }}>
                            {activeSession.company_name}
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                            <View>
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                    Clock In
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                    {new Date(activeSession.clock_in_time).toLocaleTimeString()}
                                </Text>
                            </View>
                            {activeSession.clock_in_verified ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.success, marginLeft: 4 }}>
                                        Verified
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="warning" size={16} color={colors.warning} />
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning, marginLeft: 4 }}>
                                        {activeSession.clock_in_distance_meters}m from site
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Break/Clock Out Buttons */}
                        {activeSession.status === 'on_break' ? (
                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.success,
                                    paddingVertical: spacing.md,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center'
                                }}
                                onPress={handleEndBreak}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                        {t('work.endBreak')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={{ gap: spacing.sm }}>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.warningLight,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.base,
                                            alignItems: 'center'
                                        }}
                                        onPress={() => handleStartBreak('lunch')}
                                        disabled={processing}
                                    >
                                        <Text style={{ color: colors.warning, fontWeight: '600' }}>Lunch Break</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.primaryLight,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.base,
                                            alignItems: 'center'
                                        }}
                                        onPress={() => handleStartBreak('rest')}
                                        disabled={processing}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Rest Break</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.error,
                                        paddingVertical: spacing.md,
                                        borderRadius: borderRadius.base,
                                        alignItems: 'center'
                                    }}
                                    onPress={handleClockOut}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                            {t('work.clockOut')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Upcoming Jobs (for clock in) */}
                {!activeSession && upcomingJobs.length > 0 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: spacing.md
                        }}>
                            Ready to Clock In
                        </Text>
                        {upcomingJobs.map((job: any) => (
                            <View
                                key={job.id}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}
                            >
                                <Text style={{
                                    fontSize: typography.fontSize.base,
                                    fontWeight: '600',
                                    color: colors.text,
                                    marginBottom: spacing.xs
                                }}>
                                    {job.job?.title || job.title}
                                </Text>
                                <Text style={{
                                    fontSize: typography.fontSize.sm,
                                    color: colors.textSecondary,
                                    marginBottom: spacing.md
                                }}>
                                    {job.job?.company_name || job.company_name}
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.success,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.base,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => handleClockIn(job.id)}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: '700' }}>
                                            {t('work.clockIn')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Work History */}
                {workHistory.length > 0 && (
                    <View>
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: spacing.md
                        }}>
                            {t('work.workHistory')}
                        </Text>
                        {workHistory.map((session) => (
                            <View
                                key={session.id}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '600',
                                            color: colors.text
                                        }}>
                                            {session.job_title}
                                        </Text>
                                        <Text style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.textSecondary
                                        }}>
                                            {new Date(session.clock_in_time).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '700',
                                            color: colors.primary
                                        }}>
                                            {session.total_work_minutes ? formatDuration(session.total_work_minutes) : '-'}
                                        </Text>
                                        {session.total_earnings && (
                                            <Text style={{
                                                fontSize: typography.fontSize.sm,
                                                color: colors.success
                                            }}>
                                                RM {Number(session.total_earnings).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {!activeSession && upcomingJobs.length === 0 && workHistory.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="time-outline" size={64} color={colors.textMuted} />
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '600',
                            color: colors.text,
                            marginTop: spacing.md
                        }}>
                            No Active Jobs
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.sm
                        }}>
                            Apply for jobs to start clocking in
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
