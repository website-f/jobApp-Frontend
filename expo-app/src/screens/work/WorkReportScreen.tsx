import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import workService from '../../services/workService';

type RouteParams = {
    WorkReport: {
        sessionId: number;
        jobTitle: string;
        companyName: string;
        totalHours: number;
        totalEarnings: number;
    };
};

// Custom Modal Component
interface CustomModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    onClose: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({
    visible,
    type,
    title,
    message,
    onClose,
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
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function WorkReportScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'WorkReport'>>();
    const colors = useColors();

    const { sessionId, jobTitle, companyName, totalHours, totalEarnings } = route.params;

    const [tasksCompleted, setTasksCompleted] = useState('');
    const [challengesFaced, setChallengesFaced] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [qualityRating, setQualityRating] = useState<number>(0);
    const [submitting, setSubmitting] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        type: 'success' | 'error' | 'warning';
        title: string;
        message: string;
    }>({ type: 'success', title: '', message: '' });

    const showModal = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
        setModalConfig({ type, title, message });
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!tasksCompleted.trim()) {
            showModal('warning', 'Required Field', 'Please describe the tasks you completed during your work session.');
            return;
        }

        setSubmitting(true);
        try {
            await workService.submitWorkReport({
                work_session_id: sessionId,
                tasks_completed: tasksCompleted.trim(),
                challenges_faced: challengesFaced.trim() || undefined,
                additional_notes: additionalNotes.trim() || undefined,
                quality_rating: qualityRating > 0 ? qualityRating : undefined,
            });

            showModal(
                'success',
                'Report Submitted!',
                'Your work report has been submitted successfully. The employer will review it soon.'
            );
        } catch (error: any) {
            const errorMessage = error?.response?.data?.error ||
                error?.response?.data?.work_session_id?.[0] ||
                'Failed to submit report. Please try again.';
            showModal('error', 'Submission Failed', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (modalConfig.type === 'success') {
            // Navigate back to clock in/out screen on success
            navigation.navigate('ClockInOut');
        }
    };

    const handleSkip = () => {
        navigation.navigate('ClockInOut');
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity
                    key={i}
                    onPress={() => setQualityRating(i)}
                    style={{ padding: 4 }}
                >
                    <Ionicons
                        name={i <= qualityRating ? 'star' : 'star-outline'}
                        size={32}
                        color={i <= qualityRating ? colors.warning : colors.textMuted}
                    />
                </TouchableOpacity>
            );
        }
        return stars;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={handleSkip}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{
                    flex: 1,
                    fontSize: typography.fontSize.lg,
                    fontWeight: '600',
                    color: colors.text,
                    marginLeft: spacing.md,
                }}>
                    Work Report
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.base }}>
                {/* Summary Card */}
                <View style={{
                    backgroundColor: colors.success + '15',
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.lg,
                    borderWidth: 1,
                    borderColor: colors.success + '30',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.success,
                            marginLeft: spacing.sm,
                        }}>
                            Work Session Complete
                        </Text>
                    </View>
                    <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                        {jobTitle}
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                        {companyName}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg }}>
                        <View>
                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Hours</Text>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                {totalHours.toFixed(2)}h
                            </Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Earnings</Text>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.success }}>
                                RM {totalEarnings.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Report Form */}
                <Text style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: spacing.md,
                }}>
                    Submit Your Work Report
                </Text>

                {/* Tasks Completed */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing.sm,
                    }}>
                        Tasks Completed <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.base,
                            padding: spacing.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            color: colors.text,
                            fontSize: typography.fontSize.base,
                            minHeight: 100,
                            textAlignVertical: 'top',
                        }}
                        placeholder="Describe the tasks you completed during this work session..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        value={tasksCompleted}
                        onChangeText={setTasksCompleted}
                    />
                </View>

                {/* Challenges Faced */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing.sm,
                    }}>
                        Challenges Faced (Optional)
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.base,
                            padding: spacing.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            color: colors.text,
                            fontSize: typography.fontSize.base,
                            minHeight: 80,
                            textAlignVertical: 'top',
                        }}
                        placeholder="Any difficulties or challenges you encountered..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        value={challengesFaced}
                        onChangeText={setChallengesFaced}
                    />
                </View>

                {/* Additional Notes */}
                <View style={{ marginBottom: spacing.lg }}>
                    <Text style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing.sm,
                    }}>
                        Additional Notes (Optional)
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.base,
                            padding: spacing.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            color: colors.text,
                            fontSize: typography.fontSize.base,
                            minHeight: 80,
                            textAlignVertical: 'top',
                        }}
                        placeholder="Any other information you'd like to share..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        value={additionalNotes}
                        onChangeText={setAdditionalNotes}
                    />
                </View>

                {/* Self-Assessment Rating */}
                <View style={{ marginBottom: spacing.xl }}>
                    <Text style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing.sm,
                    }}>
                        Self-Assessment (Optional)
                    </Text>
                    <Text style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                        marginBottom: spacing.sm,
                    }}>
                        Rate your performance for this work session
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                        {renderStars()}
                    </View>
                    {qualityRating > 0 && (
                        <Text style={{
                            textAlign: 'center',
                            fontSize: typography.fontSize.sm,
                            color: colors.textSecondary,
                            marginTop: spacing.xs,
                        }}>
                            {qualityRating === 5 ? 'Excellent' :
                                qualityRating === 4 ? 'Good' :
                                    qualityRating === 3 ? 'Average' :
                                        qualityRating === 2 ? 'Below Average' : 'Poor'}
                        </Text>
                    )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.primary,
                        paddingVertical: spacing.md,
                        borderRadius: borderRadius.base,
                        alignItems: 'center',
                        marginBottom: spacing.md,
                    }}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={{
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: typography.fontSize.base,
                        }}>
                            Submit Report
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Skip Button */}
                <TouchableOpacity
                    style={{
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                    }}
                    onPress={handleSkip}
                >
                    <Text style={{
                        color: colors.textMuted,
                        fontSize: typography.fontSize.sm,
                    }}>
                        Skip for now
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Custom Modal */}
            <CustomModal
                visible={modalVisible}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={handleModalClose}
            />
        </SafeAreaView>
    );
}
