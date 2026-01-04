import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import penaltyService, { Penalty, PenaltySummary } from '../../services/penaltyService';

export default function PenaltyScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [summary, setSummary] = useState<PenaltySummary | null>(null);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
    const [appealReason, setAppealReason] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [penaltiesData, summaryData] = await Promise.all([
                penaltyService.getMyPenalties(),
                penaltyService.getPenaltySummary()
            ]);
            setPenalties(penaltiesData);
            setSummary(summaryData);
        } catch (error) {
            console.error('Error fetching penalties:', error);
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

    const handleSubmitAppeal = async () => {
        if (!selectedPenalty || !appealReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for your appeal');
            return;
        }

        setProcessing(true);
        try {
            await penaltyService.submitAppeal(selectedPenalty.id, appealReason);
            Alert.alert('Success', 'Your appeal has been submitted for review');
            setShowAppealModal(false);
            setAppealReason('');
            setSelectedPenalty(null);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to submit appeal');
        } finally {
            setProcessing(false);
        }
    };

    const openAppealModal = (penalty: Penalty) => {
        if (penalty.appeal_status !== 'none') {
            Alert.alert('Appeal Already Submitted', 'You have already submitted an appeal for this penalty.');
            return;
        }
        setSelectedPenalty(penalty);
        setShowAppealModal(true);
    };

    const getPenaltyTypeIcon = (type: string): string => {
        switch (type) {
            case 'no_show': return 'close-circle';
            case 'late_arrival': return 'time';
            case 'early_leave': return 'exit';
            case 'withdrawal': return 'arrow-undo';
            case 'misconduct': return 'warning';
            default: return 'alert-circle';
        }
    };

    const getPenaltyTypeColor = (severity: string) => {
        switch (severity) {
            case 'low': return colors.warning;
            case 'medium': return '#FF9500';
            case 'high': return colors.error;
            case 'critical': return '#8B0000';
            default: return colors.textMuted;
        }
    };

    const getAppealStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return colors.warning;
            case 'approved': return colors.success;
            case 'rejected': return colors.error;
            default: return colors.textMuted;
        }
    };

    const formatPenaltyType = (type: string) => {
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
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
                    {t('penalties.title')}
                </Text>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {/* Summary Card */}
                {summary && (
                    <View style={{
                        backgroundColor: summary.is_suspended || summary.is_banned
                            ? colors.errorLight
                            : summary.is_warned
                                ? colors.warningLight
                                : colors.successLight,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                        borderWidth: 1,
                        borderColor: summary.is_suspended || summary.is_banned
                            ? colors.error
                            : summary.is_warned
                                ? colors.warning
                                : colors.success
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                            <Ionicons
                                name={summary.is_banned ? 'ban' : summary.is_suspended ? 'pause-circle' : summary.is_warned ? 'warning' : 'shield-checkmark'}
                                size={32}
                                color={summary.is_suspended || summary.is_banned ? colors.error : summary.is_warned ? colors.warning : colors.success}
                            />
                            <View style={{ marginLeft: spacing.md }}>
                                <Text style={{
                                    fontSize: typography.fontSize.lg,
                                    fontWeight: '700',
                                    color: summary.is_suspended || summary.is_banned ? colors.error : summary.is_warned ? colors.warning : colors.success
                                }}>
                                    {summary.is_banned ? 'Account Banned' :
                                        summary.is_suspended ? 'Account Suspended' :
                                            summary.is_warned ? 'Warning Issued' : 'Good Standing'}
                                </Text>
                                {summary.suspension_end_date && (
                                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.error }}>
                                        Suspended until: {new Date(summary.suspension_end_date).toLocaleDateString()}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                alignItems: 'center'
                            }}>
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                                    Penalty Points
                                </Text>
                                <Text style={{
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: '700',
                                    color: summary.total_penalty_points > 50 ? colors.error : colors.text
                                }}>
                                    {summary.total_penalty_points}
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                alignItems: 'center'
                            }}>
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                                    Active Penalties
                                </Text>
                                <Text style={{
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: '700',
                                    color: colors.text
                                }}>
                                    {summary.active_penalties_count}
                                </Text>
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                alignItems: 'center'
                            }}>
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                                    Total Fines
                                </Text>
                                <Text style={{
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: '700',
                                    color: colors.error
                                }}>
                                    RM {summary.total_fines.toFixed(0)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Penalties List */}
                <Text style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: spacing.md
                }}>
                    {t('penalties.history')}
                </Text>

                {penalties.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="shield-checkmark" size={64} color={colors.success} />
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '600',
                            color: colors.text,
                            marginTop: spacing.md
                        }}>
                            No Penalties
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.sm
                        }}>
                            Great job! Keep up the good work.
                        </Text>
                    </View>
                ) : (
                    penalties.map((penalty) => (
                        <View
                            key={penalty.id}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.md,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                borderLeftWidth: 4,
                                borderLeftColor: getPenaltyTypeColor(penalty.severity)
                            }}
                        >
                            {/* Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: `${getPenaltyTypeColor(penalty.severity)}20`,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: spacing.md
                                    }}>
                                        <Ionicons
                                            name={getPenaltyTypeIcon(penalty.penalty_type) as any}
                                            size={20}
                                            color={getPenaltyTypeColor(penalty.severity)}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '700',
                                            color: colors.text
                                        }}>
                                            {formatPenaltyType(penalty.penalty_type)}
                                        </Text>
                                        <Text style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.textSecondary
                                        }}>
                                            {penalty.job_title}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{
                                    backgroundColor: `${getPenaltyTypeColor(penalty.severity)}20`,
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: spacing.xs,
                                    borderRadius: borderRadius.base
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.xs,
                                        fontWeight: '600',
                                        color: getPenaltyTypeColor(penalty.severity),
                                        textTransform: 'uppercase'
                                    }}>
                                        {penalty.severity}
                                    </Text>
                                </View>
                            </View>

                            {/* Details */}
                            <Text style={{
                                fontSize: typography.fontSize.sm,
                                color: colors.text,
                                marginBottom: spacing.md
                            }}>
                                {penalty.description}
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Points Deducted
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.error }}>
                                        -{penalty.points_deducted}
                                    </Text>
                                </View>
                                {penalty.fine_amount > 0 && (
                                    <View>
                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                            Fine
                                        </Text>
                                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.error }}>
                                            RM {penalty.fine_amount.toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        Date
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text }}>
                                        {new Date(penalty.issued_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Appeal Status */}
                            {penalty.appeal_status !== 'none' && (
                                <View style={{
                                    backgroundColor: `${getAppealStatusColor(penalty.appeal_status)}20`,
                                    borderRadius: borderRadius.base,
                                    padding: spacing.sm,
                                    marginBottom: spacing.md
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: getAppealStatusColor(penalty.appeal_status),
                                        fontWeight: '600'
                                    }}>
                                        Appeal: {penalty.appeal_status.charAt(0).toUpperCase() + penalty.appeal_status.slice(1)}
                                    </Text>
                                    {penalty.appeal_response && (
                                        <Text style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.text,
                                            marginTop: spacing.xs
                                        }}>
                                            Response: {penalty.appeal_response}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Appeal Button */}
                            {penalty.is_active && penalty.appeal_status === 'none' && (
                                <TouchableOpacity
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.primary,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.base,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => openAppealModal(penalty)}
                                >
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        {t('penalties.appeal')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Inactive Badge */}
                            {!penalty.is_active && (
                                <View style={{
                                    backgroundColor: colors.successLight,
                                    paddingVertical: spacing.xs,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center'
                                }}>
                                    <Text style={{ color: colors.success, fontWeight: '600', fontSize: typography.fontSize.sm }}>
                                        Resolved
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Information Card */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.lg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder
                }}>
                    <Text style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: '700',
                        color: colors.text,
                        marginBottom: spacing.md
                    }}>
                        Penalty Point Thresholds
                    </Text>
                    <View style={{ gap: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="warning" size={16} color={colors.warning} />
                            <Text style={{ marginLeft: spacing.sm, color: colors.text }}>
                                30 points - Warning issued
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pause-circle" size={16} color="#FF9500" />
                            <Text style={{ marginLeft: spacing.sm, color: colors.text }}>
                                60 points - 7-day suspension
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="ban" size={16} color={colors.error} />
                            <Text style={{ marginLeft: spacing.sm, color: colors.text }}>
                                100 points - Account banned
                            </Text>
                        </View>
                    </View>
                    <Text style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                        marginTop: spacing.md
                    }}>
                        Points expire after 90 days of good behavior.
                    </Text>
                </View>
            </ScrollView>

            {/* Appeal Modal */}
            <Modal
                visible={showAppealModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAppealModal(false)}
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
                        padding: spacing.lg
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                {t('penalties.submitAppeal')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAppealModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedPenalty && (
                            <View style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                marginBottom: spacing.lg
                            }}>
                                <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                    {formatPenaltyType(selectedPenalty.penalty_type)}
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                                    {selectedPenalty.description}
                                </Text>
                            </View>
                        )}

                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text, marginBottom: spacing.xs }}>
                            Reason for Appeal *
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                fontSize: typography.fontSize.base,
                                color: colors.text,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                marginBottom: spacing.lg
                            }}
                            value={appealReason}
                            onChangeText={setAppealReason}
                            placeholder="Explain why you believe this penalty should be reversed..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                        />

                        <Text style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.textSecondary,
                            marginBottom: spacing.md
                        }}>
                            Appeals are reviewed within 48 hours. You can only submit one appeal per penalty.
                        </Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: borderRadius.base,
                                alignItems: 'center'
                            }}
                            onPress={handleSubmitAppeal}
                            disabled={processing}
                        >
                            {processing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                    Submit Appeal
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
