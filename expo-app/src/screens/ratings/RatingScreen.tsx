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
import ratingService, { Review } from '../../services/ratingService';

type TabType = 'received' | 'given';

interface RatingCriteria {
    attendance_punctuality: number;
    work_quality: number;
    competencies: number;
    compliance_safety: number;
    professionalism: number;
}

export default function RatingScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('received');
    const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
    const [givenReviews, setGivenReviews] = useState<Review[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [ratings, setRatings] = useState<RatingCriteria>({
        attendance_punctuality: 5,
        work_quality: 5,
        competencies: 5,
        compliance_safety: 5,
        professionalism: 5,
    });

    const fetchData = useCallback(async () => {
        try {
            const [received, given] = await Promise.all([
                ratingService.getReceivedReviews(),
                ratingService.getGivenReviews()
            ]);
            setReceivedReviews(received);
            setGivenReviews(given);
        } catch (error) {
            console.error('Error fetching reviews:', error);
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

    const handleSubmitReview = async () => {
        if (!selectedSession) return;

        setProcessing(true);
        try {
            await ratingService.submitReview({
                work_session_id: selectedSession.id,
                ...ratings,
                comment: reviewComment
            });
            Alert.alert('Success', 'Review submitted successfully');
            setShowReviewModal(false);
            setReviewComment('');
            setRatings({
                attendance_punctuality: 5,
                work_quality: 5,
                competencies: 5,
                compliance_safety: 5,
                professionalism: 5,
            });
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to submit review');
        } finally {
            setProcessing(false);
        }
    };

    const renderStars = (rating: number, onPress?: (value: number) => void) => {
        return (
            <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => onPress?.(star)}
                        disabled={!onPress}
                    >
                        <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={onPress ? 28 : 16}
                            color={star <= rating ? colors.warning : colors.textMuted}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const calculateOverallRating = (review: Review) => {
        const sum = review.attendance_punctuality +
            review.work_quality +
            review.competencies +
            review.compliance_safety +
            review.professionalism;
        return (sum / 5).toFixed(1);
    };

    const getCriteriaLabel = (key: string) => {
        const labels: Record<string, string> = {
            attendance_punctuality: t('ratings.attendancePunctuality'),
            work_quality: t('ratings.workQuality'),
            competencies: t('ratings.competencies'),
            compliance_safety: t('ratings.complianceSafety'),
            professionalism: t('ratings.professionalism'),
        };
        return labels[key] || key;
    };

    const reviews = activeTab === 'received' ? receivedReviews : givenReviews;

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
                    {t('ratings.title')}
                </Text>
            </View>

            {/* Tabs */}
            <View style={{
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.card
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'received' ? colors.primary : 'transparent'
                    }}
                    onPress={() => setActiveTab('received')}
                >
                    <Text style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: '600',
                        color: activeTab === 'received' ? colors.primary : colors.textMuted
                    }}>
                        {t('ratings.received')} ({receivedReviews.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: activeTab === 'given' ? colors.primary : 'transparent'
                    }}
                    onPress={() => setActiveTab('given')}
                >
                    <Text style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: '600',
                        color: activeTab === 'given' ? colors.primary : colors.textMuted
                    }}>
                        {t('ratings.given')} ({givenReviews.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {reviews.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                        <Ionicons name="star-outline" size={64} color={colors.textMuted} />
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '600',
                            color: colors.text,
                            marginTop: spacing.md
                        }}>
                            {activeTab === 'received' ? 'No Reviews Yet' : 'No Reviews Given'}
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.base,
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.sm
                        }}>
                            {activeTab === 'received'
                                ? 'Complete jobs to receive reviews from employers'
                                : 'Review workers after job completion'
                            }
                        </Text>
                    </View>
                ) : (
                    reviews.map((review) => (
                        <View
                            key={review.id}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.md,
                                borderWidth: 1,
                                borderColor: colors.cardBorder
                            }}
                        >
                            {/* Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '700',
                                        color: colors.text
                                    }}>
                                        {review.job_title}
                                    </Text>
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.textSecondary
                                    }}>
                                        {activeTab === 'received' ? `By ${review.reviewer_name}` : `For ${review.reviewee_name}`}
                                    </Text>
                                    <Text style={{
                                        fontSize: typography.fontSize.xs,
                                        color: colors.textMuted,
                                        marginTop: spacing.xs
                                    }}>
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.xxl,
                                        fontWeight: '700',
                                        color: colors.warning
                                    }}>
                                        {calculateOverallRating(review)}
                                    </Text>
                                    {renderStars(parseFloat(calculateOverallRating(review)))}
                                </View>
                            </View>

                            {/* Criteria Breakdown */}
                            <View style={{
                                backgroundColor: colors.background,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                marginBottom: spacing.md
                            }}>
                                {Object.entries({
                                    attendance_punctuality: review.attendance_punctuality,
                                    work_quality: review.work_quality,
                                    competencies: review.competencies,
                                    compliance_safety: review.compliance_safety,
                                    professionalism: review.professionalism,
                                }).map(([key, value]) => (
                                    <View
                                        key={key}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingVertical: spacing.xs
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: typography.fontSize.sm,
                                            color: colors.textSecondary,
                                            flex: 1
                                        }}>
                                            {getCriteriaLabel(key)}
                                        </Text>
                                        {renderStars(value)}
                                    </View>
                                ))}
                            </View>

                            {/* Comment */}
                            {review.comment && (
                                <View style={{
                                    backgroundColor: colors.background,
                                    borderRadius: borderRadius.base,
                                    padding: spacing.md,
                                    borderLeftWidth: 3,
                                    borderLeftColor: colors.primary
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text,
                                        fontStyle: 'italic'
                                    }}>
                                        "{review.comment}"
                                    </Text>
                                </View>
                            )}

                            {/* Response (if any) */}
                            {review.response && (
                                <View style={{
                                    marginTop: spacing.md,
                                    backgroundColor: colors.primaryLight,
                                    borderRadius: borderRadius.base,
                                    padding: spacing.md
                                }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.xs,
                                        fontWeight: '600',
                                        color: colors.primary,
                                        marginBottom: spacing.xs
                                    }}>
                                        Response:
                                    </Text>
                                    <Text style={{
                                        fontSize: typography.fontSize.sm,
                                        color: colors.text
                                    }}>
                                        {review.response}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Submit Review Modal */}
            <Modal
                visible={showReviewModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReviewModal(false)}
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
                        maxHeight: '90%'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                {t('ratings.submitReview')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Rating Criteria */}
                            {Object.entries(ratings).map(([key, value]) => (
                                <View key={key} style={{ marginBottom: spacing.lg }}>
                                    <Text style={{
                                        fontSize: typography.fontSize.base,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: spacing.sm
                                    }}>
                                        {getCriteriaLabel(key)}
                                    </Text>
                                    {renderStars(value, (newValue) => {
                                        setRatings(prev => ({
                                            ...prev,
                                            [key]: newValue
                                        }));
                                    })}
                                </View>
                            ))}

                            {/* Comment */}
                            <Text style={{
                                fontSize: typography.fontSize.base,
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: spacing.sm
                            }}>
                                Comment (Optional)
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
                                    minHeight: 100,
                                    textAlignVertical: 'top',
                                    marginBottom: spacing.lg
                                }}
                                value={reviewComment}
                                onChangeText={setReviewComment}
                                placeholder="Share your experience..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center'
                                }}
                                onPress={handleSubmitReview}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                        {t('ratings.submit')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
