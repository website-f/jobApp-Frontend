import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import workService, { WorkSession } from '../../services/workService';
import jobService from '../../services/jobService';

// Custom Modal Component
interface CustomModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
    visible,
    type,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
}) => {
    const colors = useColors();

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return { icon: 'checkmark-circle' as const, color: colors.success || '#10B981' };
            case 'error':
                return { icon: 'close-circle' as const, color: colors.error || '#EF4444' };
            case 'warning':
                return { icon: 'warning' as const, color: colors.warning || '#F59E0B' };
            case 'confirm':
                return { icon: 'help-circle' as const, color: colors.primary };
            default:
                return { icon: 'information-circle' as const, color: colors.primary };
        }
    };

    const { icon, color } = getIconAndColor();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
            }}>
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 24,
                    width: '100%',
                    maxWidth: 340,
                    alignItems: 'center',
                }}>
                    <View style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: color + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}>
                        <Ionicons name={icon} size={36} color={color} />
                    </View>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: colors.text,
                        textAlign: 'center',
                        marginBottom: 8,
                    }}>
                        {title}
                    </Text>
                    <Text style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        textAlign: 'center',
                        marginBottom: 24,
                        lineHeight: 20,
                    }}>
                        {message}
                    </Text>
                    {type === 'confirm' ? (
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.border,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                }}
                                onPress={onClose}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{cancelText}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: color,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                }}
                                onPress={onConfirm}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600' }}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={{
                                width: '100%',
                                backgroundColor: color,
                                paddingVertical: 12,
                                borderRadius: 8,
                                alignItems: 'center',
                            }}
                            onPress={onClose}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '600' }}>{confirmText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default function ClockInOutScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const colors = useColors();
    const { t } = useTranslation();

    // Get applicationId from navigation params if provided
    const passedApplicationId = (route.params as any)?.applicationId;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
    const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [workHistory, setWorkHistory] = useState<WorkSession[]>([]);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        type: 'success' | 'error' | 'warning' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ type: 'success', title: '', message: '' });

    // Pending clock out confirmation
    const [pendingClockOut, setPendingClockOut] = useState(false);

    const showModal = (
        type: 'success' | 'error' | 'warning' | 'confirm',
        title: string,
        message: string,
        onConfirm?: () => void
    ) => {
        setModalConfig({ type, title, message, onConfirm });
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        if (pendingClockOut) {
            setPendingClockOut(false);
        }
    };

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

            // Get jobs ready for clock in (contract_acknowledged or active status)
            const applications = await jobService.getMyApplications();
            const readyToWork = applications.filter((app: any) =>
                app.status === 'contract_acknowledged' || app.status === 'active'
            );

            // If we have a passed applicationId, prioritize that application
            if (passedApplicationId) {
                const passedApp = applications.find((app: any) => app.id === passedApplicationId);
                if (passedApp && (passedApp.status === 'contract_acknowledged' || passedApp.status === 'active')) {
                    // Put the passed app first
                    const otherApps = readyToWork.filter((app: any) => app.id !== passedApplicationId);
                    setUpcomingJobs([passedApp, ...otherApps].slice(0, 5));
                } else if (passedApp) {
                    // App exists but wrong status - show error
                    let errorMsg = 'This job is not ready for clock in yet.';
                    if (passedApp.status === 'contract_sent' && !passedApp.seeker_signed_at) {
                        errorMsg = 'Please sign the contract first before clocking in.';
                    } else if (passedApp.status === 'contract_sent' && passedApp.seeker_signed_at) {
                        errorMsg = 'Waiting for employer to verify your contract. You can clock in once verified.';
                    }
                    showModal('warning', 'Cannot Clock In', errorMsg);
                    setUpcomingJobs(readyToWork.slice(0, 5));
                } else {
                    setUpcomingJobs(readyToWork.slice(0, 5));
                }
            } else {
                setUpcomingJobs(readyToWork.slice(0, 5));
            }

            // Get work history
            const history = await workService.getWorkHistory();
            setWorkHistory(history.slice(0, 10));

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [passedApplicationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleClockIn = async (applicationId: number) => {
        if (!currentLocation) {
            showModal('warning', 'Location Required', 'Please enable location services to clock in.');
            return;
        }

        setProcessing(true);
        try {
            // Round coordinates to 7 decimal places to avoid precision issues
            const result = await workService.clockIn({
                application_id: applicationId,
                latitude: Math.round(currentLocation.latitude * 10000000) / 10000000,
                longitude: Math.round(currentLocation.longitude * 10000000) / 10000000
            });

            if (result.success) {
                setActiveSession(result.session);
                showModal(
                    result.is_within_geofence ? 'success' : 'warning',
                    result.is_within_geofence ? 'Clocked In!' : 'Clocked In (Outside Geofence)',
                    result.message
                );
                fetchData();
            }
        } catch (error: any) {
            console.error('Clock in error:', error?.response?.data);

            // Parse error message from different possible structures
            let errorMessage = 'Failed to clock in. Please try again.';
            const responseData = error?.response?.data;

            if (responseData) {
                if (typeof responseData === 'string') {
                    errorMessage = responseData;
                } else if (responseData.error) {
                    errorMessage = responseData.error;
                } else if (responseData.detail) {
                    errorMessage = responseData.detail;
                } else if (responseData.application_id) {
                    // Validation error on application_id field
                    errorMessage = Array.isArray(responseData.application_id)
                        ? responseData.application_id[0]
                        : responseData.application_id;
                } else if (responseData.non_field_errors) {
                    errorMessage = Array.isArray(responseData.non_field_errors)
                        ? responseData.non_field_errors[0]
                        : responseData.non_field_errors;
                } else {
                    // Try to get any error message from the response
                    const firstKey = Object.keys(responseData)[0];
                    if (firstKey && responseData[firstKey]) {
                        const value = responseData[firstKey];
                        errorMessage = Array.isArray(value) ? value[0] : String(value);
                    }
                }
            }

            showModal('error', 'Clock In Failed', errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeSession || !currentLocation) return;

        showModal(
            'confirm',
            'Clock Out',
            'Are you sure you want to clock out?',
            async () => {
                closeModal();
                setProcessing(true);
                try {
                    // Round coordinates to 7 decimal places to avoid precision issues
                    const result = await workService.clockOut({
                        session_id: activeSession.id,
                        latitude: Math.round(currentLocation.latitude * 10000000) / 10000000,
                        longitude: Math.round(currentLocation.longitude * 10000000) / 10000000
                    });

                    if (result.success) {
                        // Navigate to work report screen to submit report
                        navigation.navigate('WorkReport', {
                            sessionId: activeSession.id,
                            jobTitle: activeSession.job_title,
                            companyName: activeSession.company_name,
                            totalHours: result.total_hours,
                            totalEarnings: result.total_earnings,
                        });
                        setActiveSession(null);
                        fetchData();
                    }
                } catch (error: any) {
                    showModal('error', 'Clock Out Failed', error?.response?.data?.error || 'Failed to clock out. Please try again.');
                } finally {
                    setProcessing(false);
                }
            }
        );
    };

    const handleStartBreak = async (breakType: string) => {
        if (!activeSession) return;

        setProcessing(true);
        try {
            await workService.startBreak(activeSession.id, breakType);
            showModal('success', 'Break Started', `Your ${breakType} break has started. Enjoy your break!`);
            fetchData();
        } catch (error: any) {
            showModal('error', 'Break Failed', error?.response?.data?.error || 'Failed to start break. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleEndBreak = async () => {
        if (!activeSession) return;

        setProcessing(true);
        try {
            await workService.endBreak(activeSession.id);
            showModal('success', 'Break Ended', 'Your break has ended. Back to work!');
            fetchData();
        } catch (error: any) {
            showModal('error', 'End Break Failed', error?.response?.data?.error || 'Failed to end break. Please try again.');
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
                        {upcomingJobs.map((application: any) => (
                            <View
                                key={application.id}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}
                            >
                                {/* Job Title */}
                                <Text style={{
                                    fontSize: typography.fontSize.lg,
                                    fontWeight: '700',
                                    color: colors.text,
                                    marginBottom: spacing.xs
                                }}>
                                    {application.job_title}
                                </Text>

                                {/* Company Name */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                                    <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.textSecondary,
                                        marginLeft: spacing.xs
                                    }}>
                                        {application.company_name}
                                    </Text>
                                </View>

                                {/* Shift Details */}
                                {application.shift_details && (
                                    <View style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: spacing.sm,
                                        marginBottom: spacing.md
                                    }}>
                                        {application.shift_details.date && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.primaryLight || '#EBF5FF',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.sm
                                            }}>
                                                <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                                                <Text style={{
                                                    fontSize: typography.fontSize.xs,
                                                    color: colors.primary,
                                                    marginLeft: 4
                                                }}>
                                                    {new Date(application.shift_details.date).toLocaleDateString('en-MY', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </Text>
                                            </View>
                                        )}
                                        {application.shift_details.start_time && application.shift_details.end_time && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.successLight || '#D1FAE5',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.sm
                                            }}>
                                                <Ionicons name="time-outline" size={12} color={colors.success || '#059669'} />
                                                <Text style={{
                                                    fontSize: typography.fontSize.xs,
                                                    color: colors.success || '#059669',
                                                    marginLeft: 4
                                                }}>
                                                    {application.shift_details.start_time.slice(0, 5)} - {application.shift_details.end_time.slice(0, 5)}
                                                </Text>
                                            </View>
                                        )}
                                        {application.shift_details.hourly_rate && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.warningLight || '#FEF3C7',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: spacing.xs,
                                                borderRadius: borderRadius.sm
                                            }}>
                                                <Text style={{
                                                    fontSize: typography.fontSize.xs,
                                                    color: colors.warning || '#D97706',
                                                    fontWeight: '600'
                                                }}>
                                                    RM {application.shift_details.hourly_rate}/hr
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Job Type Badge */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: spacing.md
                                }}>
                                    <View style={{
                                        backgroundColor: application.job_type === 'part_time' ? '#E0E7FF' : '#DBEAFE',
                                        paddingHorizontal: spacing.sm,
                                        paddingVertical: spacing.xs,
                                        borderRadius: borderRadius.sm
                                    }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.xs,
                                            color: application.job_type === 'part_time' ? '#4F46E5' : '#2563EB',
                                            fontWeight: '500'
                                        }}>
                                            {application.job_type === 'part_time' ? 'Part-Time' : 'Full-Time'}
                                        </Text>
                                    </View>
                                    <View style={{
                                        marginLeft: spacing.sm,
                                        backgroundColor: '#D1FAE5',
                                        paddingHorizontal: spacing.sm,
                                        paddingVertical: spacing.xs,
                                        borderRadius: borderRadius.sm
                                    }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.xs,
                                            color: '#059669',
                                            fontWeight: '500'
                                        }}>
                                            Contract Verified
                                        </Text>
                                    </View>
                                </View>

                                {/* Clock In Button */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.success,
                                        paddingVertical: spacing.md,
                                        borderRadius: borderRadius.base,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center'
                                    }}
                                    onPress={() => handleClockIn(application.id)}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="play-circle" size={20} color="#fff" style={{ marginRight: spacing.xs }} />
                                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                                {t('work.clockIn')}
                                            </Text>
                                        </>
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
                            No Jobs Ready for Clock In
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.sm,
                            paddingHorizontal: spacing.lg
                        }}>
                            Jobs will appear here once contracts are verified. Make sure your contract is signed and verified by the employer.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Custom Modal */}
            <CustomModal
                visible={modalVisible}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
                cancelText="Cancel"
            />
        </SafeAreaView>
    );
}
