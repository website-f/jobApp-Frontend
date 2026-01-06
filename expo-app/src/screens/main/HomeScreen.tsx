import React, { useEffect, useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, useProfileStore, useColors, useBadgeStore, spacing, typography, borderRadius } from '../../store';
import { profileService } from '../../services/profileService';
import jobService, { AIJobRecommendation } from '../../services/jobService';
import {
    Card,
    StatCard,
    ProgressBar,
    SectionHeader,
    EmptyState,
} from '../../components/ui';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const { profile, setProfile } = useProfileStore();
    const colors = useColors();
    const { unreadNotifications, fetchBadgeCounts } = useBadgeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [completeness, setCompleteness] = useState(0);
    const [aiRecommendations, setAiRecommendations] = useState<AIJobRecommendation[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    const loadProfile = async () => {
        try {
            const data = await profileService.getFullProfile();
            setProfile(data);
            setCompleteness(profileService.calculateProfileCompleteness(data));
        } catch (error) {
            console.error('Failed to load profile', error);
        }
    };

    const loadAIRecommendations = useCallback(async () => {
        if (user?.user_type !== 'seeker') return;

        setAiLoading(true);
        try {
            const response = await jobService.getAIRecommendations(5, 20);
            if (response.success && response.data) {
                setAiRecommendations(response.data.recommendations);
            }
        } catch (error) {
            console.error('Failed to load AI recommendations', error);
        } finally {
            setAiLoading(false);
        }
    }, [user?.user_type]);

    useEffect(() => {
        loadProfile();
        loadAIRecommendations();
        fetchBadgeCounts();
    }, [loadAIRecommendations]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadProfile(), loadAIRecommendations(), fetchBadgeCounts()]);
        setRefreshing(false);
    }, [loadAIRecommendations]);

    const isSeeker = user?.user_type === 'seeker';
    const displayProfile = profile?.profile || user?.profile;
    const firstName = (displayProfile as any)?.first_name || 'there';

    // Get current hour for greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Header */}
                <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.greetingRow}>
                            <View style={styles.greetingText}>
                                <Text style={styles.greeting}>{getGreeting()},</Text>
                                <Text style={styles.userName}>{firstName}!</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.notificationButton}
                                onPress={() => navigation.navigate('Notifications')}
                            >
                                <Ionicons name="notifications-outline" size={24} color="#fff" />
                                {unreadNotifications > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationCount}>
                                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.subtitle}>
                            {isSeeker ? 'Find your next opportunity' : 'Discover great talent'}
                        </Text>

                        {/* Search Bar */}
                        <TouchableOpacity
                            style={styles.searchBar}
                            onPress={() => navigation.navigate('Search')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="search" size={20} color={colors.textMuted} />
                            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
                                {isSeeker ? 'Search jobs, companies...' : 'Search candidates, skills...'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Profile Completeness Card */}
                {isSeeker && completeness < 100 && (
                    <View style={styles.section}>
                        <Card variant="outlined" style={{ borderColor: colors.primary + '40' }}>
                            <View style={styles.completenessHeader}>
                                <View style={styles.completenessIcon}>
                                    <Ionicons name="rocket" size={20} color={colors.primary} />
                                </View>
                                <View style={styles.completenessInfo}>
                                    <Text style={[styles.completenessTitle, { color: colors.text }]}>
                                        Complete Your Profile
                                    </Text>
                                    <Text style={[styles.completenessSubtitle, { color: colors.textMuted }]}>
                                        Increase your visibility to employers
                                    </Text>
                                </View>
                            </View>
                            <ProgressBar
                                progress={completeness}
                                variant="gradient"
                                size="md"
                                showPercentage={true}
                                style={{ marginTop: spacing.md }}
                            />
                        </Card>
                    </View>
                )}

                {/* AI Job Recommendations Section */}
                {isSeeker && (
                    <View style={styles.section}>
                        <View style={styles.aiSectionHeader}>
                            <View style={styles.aiHeaderLeft}>
                                <View style={[styles.aiIconBadge, { backgroundColor: colors.accentLight }]}>
                                    <Ionicons name="sparkles" size={16} color={colors.accent} />
                                </View>
                                <Text style={[styles.aiSectionTitle, { color: colors.text }]}>
                                    Jobs For You
                                </Text>
                            </View>
                            {aiRecommendations.length > 0 && (
                                <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                                    <Text style={[styles.aiViewAll, { color: colors.primary }]}>View All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {aiLoading ? (
                            <View style={[styles.aiLoadingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.aiLoadingText, { color: colors.textMuted }]}>
                                    Analyzing your profile...
                                </Text>
                            </View>
                        ) : aiRecommendations.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.aiCardsContainer}
                            >
                                {aiRecommendations.map((rec) => (
                                    <AIJobCard
                                        key={rec.job.id}
                                        recommendation={rec}
                                        colors={colors}
                                        onPress={() => navigation.navigate('Jobs')}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={[styles.aiEmptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                <View style={[styles.aiEmptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                                    <Ionicons name="sparkles-outline" size={24} color={colors.textMuted} />
                                </View>
                                <Text style={[styles.aiEmptyTitle, { color: colors.text }]}>
                                    No matches yet
                                </Text>
                                <Text style={[styles.aiEmptyText, { color: colors.textMuted }]}>
                                    Complete your profile and add skills to get AI-powered job recommendations
                                </Text>
                                <TouchableOpacity
                                    style={[styles.aiEmptyButton, { backgroundColor: colors.primary }]}
                                    onPress={() => navigation.navigate('Skills')}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                    <Text style={styles.aiEmptyButtonText}>Add Skills</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Stats Section */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Your Stats"
                        icon="analytics-outline"
                    />
                    <View style={styles.statsRow}>
                        {isSeeker ? (
                            <>
                                <StatCard
                                    title="Jobs Done"
                                    value={(displayProfile as any)?.total_jobs_completed || 0}
                                    icon="briefcase"
                                    variant="gradient"
                                    style={styles.statCard}
                                />
                                <StatCard
                                    title="Rating"
                                    value={Number((displayProfile as any)?.overall_rating || 0).toFixed(1)}
                                    icon="star"
                                    variant="default"
                                    style={styles.statCard}
                                />
                                <StatCard
                                    title="Skills"
                                    value={profile?.skills?.length || 0}
                                    icon="code-slash"
                                    variant="default"
                                    style={styles.statCard}
                                />
                            </>
                        ) : (
                            <>
                                <StatCard
                                    title="Jobs Posted"
                                    value={(displayProfile as any)?.total_jobs_posted || 0}
                                    icon="megaphone"
                                    variant="gradient"
                                    style={styles.statCard}
                                />
                                <StatCard
                                    title="Hires"
                                    value={(displayProfile as any)?.total_hires || 0}
                                    icon="people"
                                    variant="default"
                                    style={styles.statCard}
                                />
                                <StatCard
                                    title="Rating"
                                    value={Number((displayProfile as any)?.overall_rating || 0).toFixed(1)}
                                    icon="star"
                                    variant="default"
                                    style={styles.statCard}
                                />
                            </>
                        )}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Quick Actions"
                        icon="flash-outline"
                    />
                    <View style={styles.actionsGrid}>
                        {isSeeker ? (
                            <>
                                <QuickActionCard
                                    icon="time"
                                    title="Clock In/Out"
                                    description="Track work time"
                                    colors={colors}
                                    gradient={['#10B981', '#34D399']}
                                    onPress={() => navigation.navigate('ClockInOut')}
                                />
                                <QuickActionCard
                                    icon="wallet"
                                    title="My Wallet"
                                    description="Points & coins"
                                    colors={colors}
                                    gradient={['#F59E0B', '#FBBF24']}
                                    onPress={() => navigation.navigate('Wallet')}
                                />
                                <QuickActionCard
                                    icon="briefcase"
                                    title="Browse Jobs"
                                    description="Find opportunities"
                                    colors={colors}
                                    gradient={['#8B5CF6', '#A78BFA']}
                                    onPress={() => navigation.navigate('Jobs')}
                                />
                                <QuickActionCard
                                    icon="document-text"
                                    title="Upload Resume"
                                    description="Add your latest CV"
                                    colors={colors}
                                    gradient={['#0EA5E9', '#06B6D4']}
                                    onPress={() => navigation.navigate('Resumes')}
                                />
                                <QuickActionCard
                                    icon="clipboard"
                                    title="Applications"
                                    description="Track progress"
                                    colors={colors}
                                    gradient={['#EC4899', '#F472B6']}
                                    onPress={() => navigation.navigate('MyApplications')}
                                />
                                <QuickActionCard
                                    icon="time-outline"
                                    title="Work History"
                                    description="Past sessions"
                                    colors={colors}
                                    gradient={['#6366F1', '#818CF8']}
                                    onPress={() => navigation.navigate('WorkHistory')}
                                />
                            </>
                        ) : (
                            <>
                                <QuickActionCard
                                    icon="add-circle"
                                    title="Post a Job"
                                    description="Find great talent"
                                    colors={colors}
                                    gradient={['#0EA5E9', '#06B6D4']}
                                    onPress={() => navigation.navigate('PostJob')}
                                />
                                <QuickActionCard
                                    icon="people"
                                    title="Candidates"
                                    description="Browse profiles"
                                    colors={colors}
                                    gradient={['#8B5CF6', '#A78BFA']}
                                    onPress={() => navigation.navigate('Candidates')}
                                />
                                <QuickActionCard
                                    icon="wallet"
                                    title="My Wallet"
                                    description="Points & coins"
                                    colors={colors}
                                    gradient={['#F59E0B', '#FBBF24']}
                                    onPress={() => navigation.navigate('Wallet')}
                                />
                                <QuickActionCard
                                    icon="diamond"
                                    title="Premium"
                                    description="Upgrade plan"
                                    colors={colors}
                                    gradient={['#10B981', '#34D399']}
                                    onPress={() => navigation.navigate('Subscription')}
                                />
                                <QuickActionCard
                                    icon="star"
                                    title="Ratings"
                                    description="View reviews"
                                    colors={colors}
                                    gradient={['#EC4899', '#F472B6']}
                                    onPress={() => navigation.navigate('Ratings')}
                                />
                                <QuickActionCard
                                    icon="briefcase"
                                    title="My Jobs"
                                    description="Manage postings"
                                    colors={colors}
                                    gradient={['#6366F1', '#818CF8']}
                                    onPress={() => navigation.navigate('EmployerJobs')}
                                />
                            </>
                        )}
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Recent Activity"
                        icon="time-outline"
                        actionLabel="View All"
                        onAction={() => {}}
                    />
                    <Card variant="default">
                        <EmptyState
                            icon="newspaper-outline"
                            title="No recent activity"
                            description="Your recent actions will appear here"
                        />
                    </Card>
                </View>

                {/* AI Matching Promo - Only for Seekers */}
                {isSeeker && (
                    <View style={[styles.section, { marginBottom: spacing.xxl }]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('AIRecommendations' as never)}
                        >
                            <LinearGradient
                                colors={[colors.accentGradientStart || '#8B5CF6', colors.accentGradientEnd || '#6366F1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.aiPromoCard}
                            >
                                <View style={styles.aiPromoContent}>
                                    <View style={styles.aiPromoIcon}>
                                        <Ionicons name="sparkles" size={28} color="#fff" />
                                    </View>
                                    <View style={styles.aiPromoText}>
                                        <Text style={styles.aiPromoTitle}>View All AI Matches</Text>
                                        {/* <Text style={styles.aiPromoDescription}>
                                            See all jobs that match your skills and experience
                                        </Text> */}
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Quick Action Card Component
function QuickActionCard({
    icon,
    title,
    description,
    colors,
    gradient,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    colors: any;
    gradient: [string, string];
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionIconContainer}
            >
                <Ionicons name={icon} size={22} color="#fff" />
            </LinearGradient>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textMuted }]}>{description}</Text>
        </TouchableOpacity>
    );
}

// AI Job Recommendation Card Component
function AIJobCard({
    recommendation,
    colors,
    onPress,
}: {
    recommendation: AIJobRecommendation;
    colors: any;
    onPress: () => void;
}) {
    const getMatchColor = (score: number) => {
        if (score >= 80) return colors.success;
        if (score >= 60) return colors.primary;
        if (score >= 40) return colors.warning;
        return colors.textMuted;
    };

    const matchColor = getMatchColor(recommendation.match_score);

    return (
        <TouchableOpacity
            style={[styles.aiJobCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header with Match Score */}
            <View style={styles.aiJobHeader}>
                <View style={[styles.aiJobMatchBadge, { backgroundColor: matchColor + '15' }]}>
                    <Text style={[styles.aiJobMatchText, { color: matchColor }]}>
                        {recommendation.match_score.toFixed(0)}%
                    </Text>
                </View>
                <View style={[styles.aiJobTypeBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.aiJobTypeText, { color: colors.primary }]}>
                        {recommendation.job.job_type === 'full_time' ? 'Full-time' : 'Part-time'}
                    </Text>
                </View>
            </View>

            {/* Job Title */}
            <Text style={[styles.aiJobTitle, { color: colors.text }]} numberOfLines={2}>
                {recommendation.job.title}
            </Text>

            {/* Company */}
            <View style={styles.aiJobCompanyRow}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.aiJobCompany, { color: colors.textSecondary }]} numberOfLines={1}>
                    {recommendation.job.company_name}
                </Text>
            </View>

            {/* Location */}
            <View style={styles.aiJobMeta}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.aiJobMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                    {recommendation.job.location || 'Location not specified'}
                </Text>
            </View>

            {/* Matched Skills Preview */}
            {recommendation.matched_skills && recommendation.matched_skills.length > 0 && (
                <View style={styles.aiJobSkills}>
                    {recommendation.matched_skills.slice(0, 2).map((skill, i) => (
                        <View key={i} style={[styles.aiJobSkillChip, { backgroundColor: colors.successLight }]}>
                            <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                            <Text style={[styles.aiJobSkillText, { color: colors.success }]} numberOfLines={1}>
                                {skill}
                            </Text>
                        </View>
                    ))}
                    {recommendation.matched_skills.length > 2 && (
                        <Text style={[styles.aiJobMoreSkills, { color: colors.textMuted }]}>
                            +{recommendation.matched_skills.length - 2}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Extra padding for floating bottom navigation
    },
    headerGradient: {
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerContent: {},
    greetingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    greetingText: {},
    greeting: {
        fontSize: typography.fontSize.base,
        color: 'rgba(255,255,255,0.85)',
    },
    userName: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold as any,
        color: '#fff',
    },
    notificationButton: {
        position: 'relative',
        padding: spacing.sm,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#EF4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationCount: {
        fontSize: 10,
        fontWeight: typography.fontWeight.bold as any,
        color: '#fff',
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.75)',
        marginBottom: spacing.lg,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        gap: spacing.sm,
    },
    searchPlaceholder: {
        fontSize: typography.fontSize.sm,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    completenessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    completenessIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    completenessInfo: {
        flex: 1,
    },
    completenessTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    completenessSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    statCard: {
        flex: 1,
        minWidth: 0,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionCard: {
        width: '31%',
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    actionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold as any,
        textAlign: 'center',
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 10,
        textAlign: 'center',
    },
    aiPromoCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    aiPromoContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiPromoIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    aiPromoText: {
        flex: 1,
    },
    aiPromoTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold as any,
        color: '#fff',
        marginBottom: spacing.xs,
    },
    aiPromoDescription: {
        fontSize: typography.fontSize.xs,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: typography.lineHeight.relaxed,
    },
    // AI Section Header Styles
    aiSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    aiHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    aiIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiSectionTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold as any,
    },
    aiViewAll: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    // AI Loading Card
    aiLoadingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    aiLoadingText: {
        fontSize: typography.fontSize.sm,
    },
    aiCardsContainer: {
        paddingRight: spacing.lg,
        gap: spacing.md,
    },
    // AI Empty State Card
    aiEmptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    aiEmptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    aiEmptyTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    aiEmptyText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    aiEmptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        gap: 4,
    },
    aiEmptyButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
        color: '#fff',
    },
    // AI Job Card Styles
    aiJobCard: {
        width: 220,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    aiJobHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    aiJobMatchBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    aiJobMatchText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold as any,
    },
    aiJobTypeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
    },
    aiJobTypeText: {
        fontSize: 10,
        fontWeight: typography.fontWeight.medium as any,
    },
    aiJobTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold as any,
        marginBottom: spacing.xs,
        lineHeight: 20,
    },
    aiJobCompanyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: spacing.xs,
    },
    aiJobCompany: {
        fontSize: typography.fontSize.xs,
        flex: 1,
    },
    aiJobMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: spacing.sm,
    },
    aiJobMetaText: {
        fontSize: typography.fontSize.xs,
        flex: 1,
    },
    aiJobSkills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.xs,
    },
    aiJobSkillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
        gap: 3,
    },
    aiJobSkillText: {
        fontSize: 10,
        fontWeight: typography.fontWeight.medium as any,
    },
    aiJobMoreSkills: {
        fontSize: 10,
        marginLeft: 2,
    },
});
