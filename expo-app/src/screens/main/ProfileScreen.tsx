import React, { useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore, useProfileStore, useColors, spacing, typography, borderRadius } from '../../store';
import profileService from '../../services/profileService';
import { formatSalaryRange } from '../../utils/currency';
import { useTranslation } from '../../hooks';
import {
    Card,
    Badge,
    Avatar,
    Button,
    SectionHeader,
    ProgressBar,
    Chip,
    StatCard,
} from '../../components/ui';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavigationProp>();
    const { user } = useAuthStore();
    const { profile, setProfile, isLoading, setLoading } = useProfileStore();
    const [refreshing, setRefreshing] = React.useState(false);
    const colors = useColors();
    const { t } = useTranslation();

    const isSeeker = user?.user_type === 'seeker';

    const loadProfile = async () => {
        setLoading(true);
        try {
            const data = await profileService.getFullProfile();
            setProfile(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadProfile();
        setRefreshing(false);
    }, []);

    const seekerProfile = profile?.profile;
    const avatarUrl = seekerProfile?.avatar_url;
    const completeness = seekerProfile?.profile_completeness || 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header with Gradient */}
                <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerContent}>
                        {/* Avatar with Edit Button */}
                        <TouchableOpacity style={styles.avatarContainer}>
                            <Avatar
                                source={avatarUrl ? { uri: avatarUrl } : undefined}
                                name={seekerProfile?.first_name || user?.email}
                                size="2xl"
                            />
                            <View style={[styles.editAvatarButton, { backgroundColor: colors.card }]}>
                                <Ionicons name="camera" size={16} color={colors.primary} />
                            </View>
                        </TouchableOpacity>

                        {/* Name & Headline */}
                        <Text style={styles.profileName}>
                            {seekerProfile?.full_name || seekerProfile?.display_name || user?.email}
                        </Text>

                        {seekerProfile?.headline && (
                            <Text style={styles.profileHeadline}>
                                {seekerProfile.headline}
                            </Text>
                        )}

                        {/* Badges */}
                        <View style={styles.badgesRow}>
                            {seekerProfile?.is_verified && (
                                <Badge variant="verified" size="sm">{t('profile.verified')}</Badge>
                            )}
                            {seekerProfile?.is_premium && (
                                <Badge variant="premium" size="sm">{t('profile.premium')}</Badge>
                            )}
                            {seekerProfile?.availability_status === 'available' && (
                                <Badge variant="success" size="sm">{t('profile.availableForWork')}</Badge>
                            )}
                        </View>

                        {/* Edit Profile Button */}
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate('EditProfile', { section: 'basic' })}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                            <Text style={[styles.editButtonText, { color: colors.primary }]}>{t('profile.editProfile')}</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Profile Completeness */}
                {isSeeker && completeness < 100 && (
                    <View style={styles.section}>
                        <Card variant="outlined" style={{ borderColor: colors.primary + '40' }}>
                            <View style={styles.completenessHeader}>
                                <View style={styles.completenessIcon}>
                                    <Ionicons name="rocket" size={20} color={colors.primary} />
                                </View>
                                <View style={styles.completenessText}>
                                    <Text style={[styles.completenessTitle, { color: colors.text }]}>
                                        {t('profile.completeYourProfile')}
                                    </Text>
                                    <Text style={[styles.completenessSubtitle, { color: colors.textMuted }]}>
                                        {t('profile.increaseVisibility')}
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

                {/* Stats Section */}
                {isSeeker && (
                    <View style={styles.section}>
                        <View style={styles.statsRow}>
                            <StatCard
                                title={t('profile.rating')}
                                value={seekerProfile?.overall_rating ? Number(seekerProfile.overall_rating).toFixed(1) : '0.0'}
                                icon="star"
                                variant="default"
                                style={styles.statCard}
                            />
                            <StatCard
                                title={t('profile.jobsDone')}
                                value={seekerProfile?.total_jobs_completed || 0}
                                icon="briefcase"
                                variant="default"
                                style={styles.statCard}
                            />
                            <StatCard
                                title={t('profile.profileProgress')}
                                value={`${completeness}%`}
                                icon="checkmark-circle"
                                variant="default"
                                style={styles.statCard}
                            />
                        </View>
                    </View>
                )}

                {/* Profile Sections */}
                <View style={styles.section}>
                    {/* About */}
                    <ProfileSectionCard
                        title={t('profile.about')}
                        icon="person-outline"
                        onPress={() => navigation.navigate('EditProfile', { section: 'about' })}
                        colors={colors}
                    >
                        {seekerProfile?.bio ? (
                            <Text style={[styles.sectionText, { color: colors.text }]} numberOfLines={3}>
                                
                            </Text>
                        ) : (
                            <EmptySection
                                message={t('profile.addBio')}
                                colors={colors}
                            />
                        )}
                    </ProfileSectionCard>

                    {/* Skills */}
                    {isSeeker && (
                        <ProfileSectionCard
                            title={t('profile.skills')}
                            icon="code-slash"
                            onPress={() => navigation.navigate('Skills')}
                            colors={colors}
                            badge={profile?.skills?.length ? `${profile.skills.length}` : undefined}
                        >
                            {profile?.skills && profile.skills.length > 0 ? (
                                <View style={styles.skillsContainer}>
                                    {profile.skills.slice(0, 6).map((skill: any, index: number) => (
                                        <Chip
                                            key={index}
                                            label={skill.name || skill.skill_name}
                                            variant="filled"
                                            size="sm"
                                        />
                                    ))}
                                    {profile.skills.length > 6 && (
                                        <Chip
                                            label={`+${profile.skills.length - 6}`}
                                            variant="outlined"
                                            size="sm"
                                        />
                                    )}
                                </View>
                            ) : (
                                <EmptySection
                                    message={t('profile.addSkills')}
                                    colors={colors}
                                />
                            )}
                        </ProfileSectionCard>
                    )}

                    {/* Resume */}
                    {isSeeker && (
                        <ProfileSectionCard
                            title={t('profile.resume')}
                            icon="document-text-outline"
                            onPress={() => navigation.navigate('Resumes')}
                            colors={colors}
                            badge={profile?.resumes?.length ? `${profile.resumes.length}` : undefined}
                        >
                            {profile?.resumes && profile.resumes.length > 0 ? (
                                <View style={styles.resumeInfo}>
                                    <View style={[styles.resumeIcon, { backgroundColor: colors.successLight }]}>
                                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                    </View>
                                    <View style={styles.resumeText}>
                                        <Text style={[styles.resumeTitle, { color: colors.text }]}>
                                            {profile.resumes.length === 1 ? t('profile.resumeUploaded') : t('profile.resumesUploaded')}
                                        </Text>
                                        <Text style={[styles.resumeSubtitle, { color: colors.textMuted }]}>
                                            {profile.resumes.length} resume(s) total
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <EmptySection
                                    message={t('profile.uploadResume')}
                                    colors={colors}
                                />
                            )}
                        </ProfileSectionCard>
                    )}

                    {/* Availability */}
                    {isSeeker && (
                        <ProfileSectionCard
                            title={t('profile.availability')}
                            icon="calendar-outline"
                            onPress={() => navigation.navigate('Availability')}
                            colors={colors}
                        >
                            <View style={styles.availabilityRow}>
                                <View style={[
                                    styles.availabilityDot,
                                    {
                                        backgroundColor: seekerProfile?.availability_status === 'available'
                                            ? colors.success
                                            : seekerProfile?.availability_status === 'busy'
                                                ? colors.warning
                                                : colors.error
                                    }
                                ]} />
                                <View>
                                    <Text style={[styles.availabilityText, { color: colors.text }]}>
                                        {seekerProfile?.availability_status === 'available'
                                            ? t('profile.availableForWork')
                                            : seekerProfile?.availability_status === 'busy'
                                                ? t('profile.currentlyBusy')
                                                : t('profile.notAvailable')}
                                    </Text>
                                    <Text style={[styles.availabilityHint, { color: colors.textMuted }]}>
                                        {t('profile.manageCalendar')}
                                    </Text>
                                </View>
                            </View>
                        </ProfileSectionCard>
                    )}

                    {/* Location */}
                    <ProfileSectionCard
                        title={t('profile.location')}
                        icon="location-outline"
                        onPress={() => navigation.navigate('Location')}
                        colors={colors}
                    >
                        
                    </ProfileSectionCard>

                    {/* Salary Expectations / Hourly Rate */}
                    {isSeeker && (
                        <ProfileSectionCard
                            title={t('profile.salaryExpectations')}
                            icon="cash-outline"
                            onPress={() => navigation.navigate('EditProfile', { section: 'basic' })}
                            colors={colors}
                        >
                            {seekerProfile?.hourly_rate_min || seekerProfile?.hourly_rate_max ? (
                                <View style={styles.rateContainer}>
                                    <Text style={[styles.rateAmount, { color: colors.primary }]}>
                                        {formatSalaryRange(
                                            seekerProfile?.hourly_rate_min,
                                            seekerProfile?.hourly_rate_max,
                                            user?.preferred_currency || seekerProfile?.rate_currency || 'MYR',
                                            'hourly'
                                        )}
                                    </Text>
                                </View>
                            ) : (
                                <EmptySection
                                    message={t('profile.setSalaryRange')}
                                    colors={colors}
                                />
                            )}
                        </ProfileSectionCard>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Profile Section Card Component
function ProfileSectionCard({
    title,
    icon,
    children,
    onPress,
    colors,
    badge,
}: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
    onPress: () => void;
    colors: any;
    badge?: string;
}) {
    return (
        <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name={icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                    {badge && (
                        <View style={[styles.sectionBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>{badge}</Text>
                        </View>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
            <View style={styles.sectionContent}>{children}</View>
        </TouchableOpacity>
    );
}

// Empty Section Component
function EmptySection({ message, colors }: { message: string; colors: any }) {
    return (
        <View style={styles.emptySection}>
            <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>{message}</Text>
        </View>
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
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileName: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold as any,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    profileHeadline: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    editButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    section: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    statCard: {
        flex: 1,
        minWidth: 0,
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
    completenessText: {
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
    sectionCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    sectionBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    sectionBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium as any,
    },
    sectionContent: {
        marginLeft: 44,
    },
    sectionText: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.lineHeight.relaxed,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    resumeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resumeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    resumeText: {
        flex: 1,
    },
    resumeTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    resumeSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    availabilityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.sm,
    },
    availabilityText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    availabilityHint: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    locationText: {
        fontSize: typography.fontSize.sm,
    },
    rateContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
    },
    rateAmount: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold as any,
    },
    rateCurrency: {
        fontSize: typography.fontSize.sm,
    },
    emptySection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    emptySectionText: {
        fontSize: typography.fontSize.sm,
        fontStyle: 'italic',
    },
});
