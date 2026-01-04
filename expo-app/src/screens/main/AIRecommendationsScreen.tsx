import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius, useAuthStore } from '../../store';
import jobService, { AIJobRecommendation } from '../../services/jobService';
import { getCurrencySymbol } from '../../utils/currency';
import { useTranslation } from '../../hooks';

export default function AIRecommendationsScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [recommendations, setRecommendations] = useState<AIJobRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<AIJobRecommendation | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Application form state
    const [showApplyView, setShowApplyView] = useState(false);
    const [applicationType, setApplicationType] = useState<'apply' | 'bid'>('apply');
    const [coverLetter, setCoverLetter] = useState('');
    const [proposedRate, setProposedRate] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());

    // Get user's preferred currency
    const preferredCurrency = user?.preferred_currency || 'MYR';

    const fetchRecommendations = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        setError(null);

        try {
            const response = await jobService.getAIRecommendations(20, 20);
            if (response.success && response.data) {
                setRecommendations(response.data.recommendations);
            } else {
                setError(response.error || 'Failed to get recommendations');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRecommendations();
        fetchAppliedJobs();
    }, [fetchRecommendations]);

    const fetchAppliedJobs = async () => {
        try {
            const applications = await jobService.getMyApplications();
            const jobIds = new Set<number>(applications.map((app: any) => app.job?.id || app.job).filter(Boolean));
            setAppliedJobIds(jobIds);
        } catch (error) {
            console.log('Could not fetch applied jobs:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecommendations(true);
    };

    // Check if job has been applied to
    const isJobApplied = (jobId: number) => appliedJobIds.has(jobId);

    // Handle job application
    const handleApplyForJob = async () => {
        if (!selectedJob) return;

        console.log('Submitting application for job:', selectedJob.job.id);
        setIsApplying(true);
        try {
            await jobService.applyForJob(selectedJob.job.id, {
                application_type: applicationType,
                cover_letter: coverLetter || undefined,
                proposed_rate: applicationType === 'bid' && proposedRate ? parseFloat(proposedRate) : undefined,
            });

            console.log('Application submitted successfully');
            // Add to applied jobs set immediately
            setAppliedJobIds(prev => new Set([...prev, selectedJob.job.id]));

            Alert.alert('Success!', 'Your application has been submitted successfully.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowApplyView(false);
                        setShowDetailModal(false);
                        setCoverLetter('');
                        setProposedRate('');
                        setApplicationType('apply');
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Application error:', error?.response?.data || error?.message || error);
            let errorMessage = 'Failed to submit application. Please try again.';

            if (error?.response?.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors.join(', ');
                } else if (data.job) {
                    errorMessage = Array.isArray(data.job) ? data.job.join(', ') : data.job;
                } else {
                    const firstKey = Object.keys(data)[0];
                    if (firstKey) {
                        const value = data[firstKey];
                        errorMessage = Array.isArray(value) ? value.join(', ') : String(value);
                    }
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Application Failed', errorMessage);
        } finally {
            setIsApplying(false);
        }
    };

    // Format salary
    const formatSalary = (job: AIJobRecommendation['job']) => {
        if (!job.salary_amount) return 'Salary not specified';
        // Format the salary amount with currency
        const amount = parseFloat(job.salary_amount);
        if (isNaN(amount)) return 'Salary not specified';
        return `${getCurrencySymbol(job.salary_currency || preferredCurrency)}${amount.toLocaleString()}`;
    };

    const getMatchColor = (score: number) => {
        if (score >= 80) return colors.success;
        if (score >= 60) return colors.primary;
        if (score >= 40) return colors.warning;
        return colors.textMuted;
    };

    const getMatchLabel = (score: number) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Low Match';
    };

    const openJobDetail = (rec: AIJobRecommendation) => {
        setSelectedJob(rec);
        setShowDetailModal(true);
        setShowApplyView(false);
        setCoverLetter('');
        setProposedRate('');
        setApplicationType('apply');
    };

    const renderRecommendationCard = (rec: AIJobRecommendation, index: number) => {
        const matchColor = getMatchColor(rec.match_score);

        return (
            <TouchableOpacity
                key={rec.job.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => openJobDetail(rec)}
                activeOpacity={0.7}
            >
                {/* Match Score Badge */}
                <View style={[styles.matchBadge, { backgroundColor: matchColor + '20' }]}>
                    <Text style={[styles.matchScore, { color: matchColor }]}>
                        {rec.match_score.toFixed(0)}%
                    </Text>
                    <Text style={[styles.matchLabel, { color: matchColor }]}>
                        {getMatchLabel(rec.match_score)}
                    </Text>
                </View>

                {/* Job Info */}
                <View style={styles.jobInfo}>
                    <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>
                        {rec.job.title}
                    </Text>
                    <Text style={[styles.companyName, { color: colors.textSecondary }]}>
                        {rec.job.company_name}
                    </Text>

                    {/* Location & Type */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                                {rec.job.location}
                            </Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.typeText, { color: colors.primary }]}>
                                {rec.job.job_type.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Match Reasons */}
                    {rec.match_reasons.length > 0 && (
                        <View style={styles.reasonsContainer}>
                            {rec.match_reasons.slice(0, 2).map((reason, i) => (
                                <View key={i} style={[styles.reasonBadge, { backgroundColor: colors.successLight }]}>
                                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                    <Text style={[styles.reasonText, { color: colors.success }]}>{reason}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Matched Skills */}
                    {rec.matched_skills.length > 0 && (
                        <View style={styles.skillsContainer}>
                            <Text style={[styles.skillsLabel, { color: colors.textSecondary }]}>
                                Matched Skills:
                            </Text>
                            <View style={styles.skillsRow}>
                                {rec.matched_skills.slice(0, 3).map((skill, i) => (
                                    <View key={i} style={[styles.skillChip, { backgroundColor: colors.primaryLight }]}>
                                        <Text style={[styles.skillText, { color: colors.primary }]}>{skill}</Text>
                                    </View>
                                ))}
                                {rec.matched_skills.length > 3 && (
                                    <Text style={[styles.moreSkills, { color: colors.textMuted }]}>
                                        +{rec.matched_skills.length - 3}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Score Breakdown Mini */}
                <View style={[styles.scoreBreakdown, { borderTopColor: colors.border }]}>
                    <View style={styles.scoreItem}>
                        <Text style={[styles.scoreValue, { color: colors.text }]}>{rec.skill_match.toFixed(0)}%</Text>
                        <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Skills</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={[styles.scoreValue, { color: colors.text }]}>{rec.location_match.toFixed(0)}%</Text>
                        <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Location</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={[styles.scoreValue, { color: colors.text }]}>{rec.rate_match.toFixed(0)}%</Text>
                        <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Rate</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerIcon}>
                        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>AI Job Matches</Text>
                        <Text style={styles.headerSubtitle}>
                            Personalized recommendations based on your profile
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Analyzing your profile...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load</Text>
                    <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={() => fetchRecommendations()}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : recommendations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Yet</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Complete your profile and add skills to get personalized job recommendations.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* Results Count */}
                    <View style={styles.resultsHeader}>
                        <Text style={[styles.resultsCount, { color: colors.text }]}>
                            {recommendations.length} Jobs Match Your Profile
                        </Text>
                        <View style={styles.aiTag}>
                            <Ionicons name="flash" size={12} color={colors.accent} />
                            <Text style={[styles.aiTagText, { color: colors.accent }]}>AI Powered</Text>
                        </View>
                    </View>

                    {/* Recommendation Cards */}
                    {recommendations.map((rec, index) => renderRecommendationCard(rec, index))}
                </ScrollView>
            )}

            {/* Job Detail Modal - Contains both job details and application form */}
            <Modal visible={showDetailModal} animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: colors.background }}
                >
                    {/* Native-style Header */}
                    <View style={{
                        backgroundColor: colors.background,
                        paddingTop: Platform.OS === 'ios' ? 50 : 40,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingBottom: 12,
                            minHeight: 44,
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (showApplyView) {
                                        // Go back to job details
                                        setShowApplyView(false);
                                    } else {
                                        // Close modal entirely and reset state
                                        setShowDetailModal(false);
                                        setShowApplyView(false);
                                        setCoverLetter('');
                                        setProposedRate('');
                                        setApplicationType('apply');
                                    }
                                }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: colors.inputBackground,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 18, color: colors.text }}>←</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                    {showApplyView
                                        ? (selectedJob?.job.job_type === 'part_time' ? t('jobs.submitBid') : t('jobs.submitApplication'))
                                        : selectedJob?.job.title
                                    }
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                    {showApplyView ? selectedJob?.job.title : selectedJob?.job.company_name}
                                </Text>
                            </View>
                            {!showApplyView && selectedJob && (
                                <View style={[styles.modalMatchBadge, { backgroundColor: getMatchColor(selectedJob.match_score) + '20' }]}>
                                    <Text style={[styles.modalMatchText, { color: getMatchColor(selectedJob.match_score) }]}>
                                        {selectedJob.match_score.toFixed(0)}%
                                    </Text>
                                </View>
                            )}
                            {!showApplyView && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDetailModal(false);
                                        setShowApplyView(false);
                                        setCoverLetter('');
                                        setProposedRate('');
                                        setApplicationType('apply');
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: colors.inputBackground,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginLeft: 8,
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ fontSize: 18, color: colors.textMuted }}>×</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {selectedJob && !showApplyView && (
                        <>
                            {/* Job Details View */}
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                                {/* Job Type & Salary Badges */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                                            {selectedJob.job.job_type.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>
                                            {formatSalary(selectedJob.job)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Location */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                                {selectedJob.job.location}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Match Score Breakdown */}
                                <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                    <Text style={[styles.scoreCardTitle, { color: colors.text }]}>Match Breakdown</Text>
                                    <View style={styles.scoreGrid}>
                                        <View style={styles.scoreGridItem}>
                                            <Text style={[styles.scoreGridValue, { color: colors.primary }]}>
                                                {selectedJob.skill_match.toFixed(0)}%
                                            </Text>
                                            <Text style={[styles.scoreGridLabel, { color: colors.textSecondary }]}>Skills</Text>
                                        </View>
                                        <View style={styles.scoreGridItem}>
                                            <Text style={[styles.scoreGridValue, { color: colors.primary }]}>
                                                {selectedJob.location_match.toFixed(0)}%
                                            </Text>
                                            <Text style={[styles.scoreGridLabel, { color: colors.textSecondary }]}>Location</Text>
                                        </View>
                                        <View style={styles.scoreGridItem}>
                                            <Text style={[styles.scoreGridValue, { color: colors.primary }]}>
                                                {selectedJob.rate_match.toFixed(0)}%
                                            </Text>
                                            <Text style={[styles.scoreGridLabel, { color: colors.textSecondary }]}>Rate</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Why This Match */}
                                {selectedJob.match_reasons.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Why This Match</Text>
                                        {selectedJob.match_reasons.map((reason, i) => (
                                            <View key={i} style={styles.reasonItem}>
                                                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                                <Text style={[styles.reasonItemText, { color: colors.text }]}>{reason}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Matched Skills */}
                                {selectedJob.matched_skills.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Matching Skills</Text>
                                        <View style={styles.skillsWrap}>
                                            {selectedJob.matched_skills.map((skill, i) => (
                                                <View key={i} style={[styles.matchedSkill, { backgroundColor: colors.successLight }]}>
                                                    <Ionicons name="checkmark" size={14} color={colors.success} />
                                                    <Text style={[styles.matchedSkillText, { color: colors.success }]}>{skill}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Missing Skills */}
                                {selectedJob.missing_skills.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills to Develop</Text>
                                        <View style={styles.skillsWrap}>
                                            {selectedJob.missing_skills.map((skill, i) => (
                                                <View key={i} style={[styles.missingSkill, { backgroundColor: colors.warningLight }]}>
                                                    <Text style={[styles.missingSkillText, { color: colors.warning }]}>{skill}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Description */}
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Description</Text>
                                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                                        {selectedJob.job.description}
                                    </Text>
                                </View>
                            </ScrollView>

                            {/* Apply Button */}
                            <View style={{
                                padding: 16,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                backgroundColor: colors.background,
                                paddingBottom: Platform.OS === 'ios' ? 30 : 16,
                            }}>
                                {isJobApplied(selectedJob.job.id) ? (
                                    <View
                                        style={{
                                            backgroundColor: colors.successLight,
                                            paddingVertical: 16,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                                            {t('jobs.alreadyApplied')}
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.primary,
                                            paddingVertical: 16,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                        }}
                                        onPress={() => setShowApplyView(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                                            {selectedJob.job.job_type === 'part_time' ? t('jobs.bidForJob') : t('jobs.applyNow')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}

                    {selectedJob && showApplyView && (
                        <>
                            {/* Application Form View */}
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                                {/* Job Summary Card */}
                                <View style={{
                                    backgroundColor: colors.card,
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{selectedJob.job.company_name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                        <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>
                                                {selectedJob.job.job_type.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{formatSalary(selectedJob.job)}</Text>
                                    </View>
                                    {/* Match Score Badge */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                                        <Ionicons name="sparkles" size={14} color={getMatchColor(selectedJob.match_score)} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: getMatchColor(selectedJob.match_score) }}>
                                            {selectedJob.match_score.toFixed(0)}% Match
                                        </Text>
                                    </View>
                                </View>

                                {/* Application Type (for part-time) */}
                                {selectedJob.job.job_type === 'part_time' && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                            {t('jobs.applicationType')}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity
                                                style={{
                                                    flex: 1,
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    borderWidth: 2,
                                                    borderColor: applicationType === 'apply' ? colors.primary : colors.border,
                                                    backgroundColor: applicationType === 'apply' ? colors.primaryLight : colors.inputBackground,
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => setApplicationType('apply')}
                                            >
                                                <Text style={{ fontSize: 20, marginBottom: 4 }}>📝</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: applicationType === 'apply' ? colors.primary : colors.text }}>
                                                    {t('jobs.apply')}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{
                                                    flex: 1,
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    borderWidth: 2,
                                                    borderColor: applicationType === 'bid' ? colors.primary : colors.border,
                                                    backgroundColor: applicationType === 'bid' ? colors.primaryLight : colors.inputBackground,
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => setApplicationType('bid')}
                                            >
                                                <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: applicationType === 'bid' ? colors.primary : colors.text }}>
                                                    {t('jobs.bid')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Proposed Rate (for bidding) */}
                                {applicationType === 'bid' && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                            Proposed Hourly Rate ({getCurrencySymbol(preferredCurrency)})
                                        </Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: colors.inputBackground,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 12,
                                                padding: 12,
                                                fontSize: 16,
                                                color: colors.text,
                                            }}
                                            placeholder="e.g. 15"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="numeric"
                                            value={proposedRate}
                                            onChangeText={setProposedRate}
                                        />
                                    </View>
                                )}

                                {/* Cover Letter */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        {t('jobs.coverLetterOptional')}
                                    </Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: colors.inputBackground,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            padding: 12,
                                            fontSize: 14,
                                            color: colors.text,
                                            height: 120,
                                            textAlignVertical: 'top',
                                        }}
                                        placeholder={t('jobs.coverLetterPlaceholder')}
                                        placeholderTextColor={colors.textMuted}
                                        multiline
                                        value={coverLetter}
                                        onChangeText={setCoverLetter}
                                    />
                                </View>
                            </ScrollView>

                            {/* Submit Button */}
                            <View style={{
                                padding: 16,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                backgroundColor: colors.background,
                                paddingBottom: Platform.OS === 'ios' ? 30 : 16,
                            }}>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: isApplying || (applicationType === 'bid' && !proposedRate) ? colors.border : colors.primary,
                                        paddingVertical: 16,
                                        borderRadius: 12,
                                        alignItems: 'center',
                                    }}
                                    onPress={handleApplyForJob}
                                    disabled={isApplying || (applicationType === 'bid' && !proposedRate)}
                                    activeOpacity={0.7}
                                >
                                    {isApplying ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                                            {applicationType === 'bid' ? t('jobs.submitBid') : t('jobs.submitApplication')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: typography.fontSize.base,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        marginTop: spacing.md,
    },
    errorText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    retryButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.base,
        marginTop: spacing.lg,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: typography.fontWeight.semibold,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.base,
        paddingBottom: spacing['2xl'],
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    resultsCount: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
    },
    aiTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    aiTagText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
    },
    card: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    matchScore: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
    },
    matchLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    jobInfo: {
        padding: spacing.md,
    },
    jobTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        marginBottom: 4,
    },
    companyName: {
        fontSize: typography.fontSize.base,
        marginBottom: spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    metaText: {
        fontSize: typography.fontSize.sm,
    },
    typeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
    },
    reasonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    reasonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    reasonText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
    },
    skillsContainer: {
        marginTop: spacing.sm,
    },
    skillsLabel: {
        fontSize: typography.fontSize.xs,
        marginBottom: 4,
    },
    skillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
    },
    skillChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
    },
    skillText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
    },
    moreSkills: {
        fontSize: typography.fontSize.xs,
    },
    scoreBreakdown: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    scoreItem: {
        flex: 1,
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
    },
    scoreLabel: {
        fontSize: typography.fontSize.xs,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    modalHeaderCenter: {
        flex: 1,
        marginHorizontal: spacing.md,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    modalMatchBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    modalMatchText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
    },
    modalContent: {
        flex: 1,
    },
    modalScrollContent: {
        padding: spacing.base,
    },
    modalCompany: {
        fontSize: typography.fontSize.lg,
        marginBottom: spacing.xs,
    },
    modalMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    modalMetaText: {
        fontSize: typography.fontSize.base,
    },
    scoreCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    scoreCardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.md,
    },
    scoreGrid: {
        flexDirection: 'row',
    },
    scoreGridItem: {
        flex: 1,
        alignItems: 'center',
    },
    scoreGridValue: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
    },
    scoreGridLabel: {
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    reasonItemText: {
        fontSize: typography.fontSize.base,
    },
    skillsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    matchedSkill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    matchedSkillText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    missingSkill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    missingSkillText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    description: {
        fontSize: typography.fontSize.base,
        lineHeight: 24,
    },
    modalFooter: {
        padding: spacing.base,
        borderTopWidth: 1,
    },
    applyButton: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.base,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
    },
});
