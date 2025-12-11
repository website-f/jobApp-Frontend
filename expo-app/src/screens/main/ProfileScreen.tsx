import React, { useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore, useProfileStore, useColors, ThemeColors } from '../../store';
import profileService from '../../services/profileService';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
    const navigation = useNavigation<ProfileNavigationProp>();
    const { user } = useAuthStore();
    const { profile, setProfile, isLoading, setLoading } = useProfileStore();
    const [refreshing, setRefreshing] = React.useState(false);
    const colors = useColors();

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Profile Header */}
                <View style={{
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 24,
                    backgroundColor: colors.backgroundSecondary,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}>
                    <TouchableOpacity style={{ position: 'relative', marginBottom: 16 }}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                        ) : (
                            <View style={{
                                width: 100,
                                height: 100,
                                borderRadius: 50,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Text style={{ fontSize: 40, fontWeight: '700', color: '#FFFFFF' }}>
                                    {seekerProfile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        <View style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            backgroundColor: colors.card,
                            borderRadius: 15,
                            width: 30,
                            height: 30,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: colors.background,
                        }}>
                            <Text style={{ fontSize: 14 }}>✏️</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'center' }}>
                        {seekerProfile?.full_name || seekerProfile?.display_name || user?.email}
                    </Text>

                    {seekerProfile?.headline && (
                        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                            {seekerProfile.headline}
                        </Text>
                    )}

                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        {seekerProfile?.is_verified && (
                            <View style={{ backgroundColor: colors.successLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>✓ Verified</Text>
                            </View>
                        )}
                        {seekerProfile?.is_premium && (
                            <View style={{ backgroundColor: colors.warningLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>⭐ Premium</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
                        onPress={() => navigation.navigate('EditProfile', { section: 'basic' })}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                {isSeeker && (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <StatCard value={seekerProfile?.overall_rating ? Number(seekerProfile.overall_rating).toFixed(1) : '0.0'} label="Rating" colors={colors} />
                            <StatCard value={seekerProfile?.total_jobs_completed || 0} label="Jobs Done" colors={colors} />
                            <StatCard value={`${seekerProfile?.profile_completeness || 0}%`} label="Complete" colors={colors} />
                        </View>
                    </View>
                )}

                {/* Profile Sections */}
                <View style={{ paddingHorizontal: 20 }}>
                    {/* About */}
                    <ProfileSection title="About" icon="📝" onPress={() => navigation.navigate('EditProfile', { section: 'about' })} colors={colors}>
                        {seekerProfile?.bio ? (
                            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{seekerProfile.bio}</Text>
                        ) : (
                            <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>Add a bio to tell employers about yourself</Text>
                        )}
                    </ProfileSection>

                    {/* Skills */}
                    {isSeeker && (
                        <ProfileSection title="Skills" icon="🎯" onPress={() => navigation.navigate('Skills')} colors={colors}>
                            {profile?.skills && profile.skills.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {profile.skills.slice(0, 5).map((skill: any, index: number) => (
                                        <View key={index} style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{skill.name}</Text>
                                        </View>
                                    ))}
                                    {profile.skills.length > 5 && (
                                        <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>+{profile.skills.length - 5} more</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>Add your skills to match with jobs</Text>
                            )}
                        </ProfileSection>
                    )}

                    {/* Resume */}
                    {isSeeker && (
                        <ProfileSection title="Resume" icon="📄" onPress={() => navigation.navigate('Resumes')} colors={colors}>
                            {profile?.has_primary_resume ? (
                                <View>
                                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>Primary resume uploaded ✓</Text>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{profile.resumes_count} resume(s) total</Text>
                                </View>
                            ) : (
                                <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>Upload your resume to apply for jobs faster</Text>
                            )}
                        </ProfileSection>
                    )}

                    {/* Availability */}
                    {isSeeker && (
                        <ProfileSection title="Availability" icon="📅" onPress={() => navigation.navigate('Availability')} colors={colors}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: seekerProfile?.availability_status === 'available' ? colors.success :
                                        seekerProfile?.availability_status === 'busy' ? colors.warning : colors.error,
                                }} />
                                <Text style={{ fontSize: 14, color: colors.text }}>
                                    {seekerProfile?.availability_status === 'available' ? 'Available for work' :
                                        seekerProfile?.availability_status === 'busy' ? 'Busy' : 'Not available'}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                Tap to manage your calendar
                            </Text>
                        </ProfileSection>
                    )}

                    {/* Location */}
                    <ProfileSection title="Location" icon="📍" onPress={() => navigation.navigate('EditProfile', { section: 'location' })} colors={colors}>
                        {seekerProfile?.city || seekerProfile?.country ? (
                            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                                {[seekerProfile?.city, seekerProfile?.country].filter(Boolean).join(', ')}
                            </Text>
                        ) : (
                            <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>Add your location for local job matches</Text>
                        )}
                    </ProfileSection>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Stat Card Component
function StatCard({ value, label, colors }: { value: string | number; label: string; colors: ThemeColors }) {
    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>{value}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
        </View>
    );
}

// Profile Section Component
function ProfileSection({
    title,
    icon,
    children,
    onPress,
    colors,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
    onPress: () => void;
    colors: ThemeColors;
}) {
    return (
        <TouchableOpacity
            style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
            }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
                </View>
                <Text style={{ fontSize: 20, color: colors.textSecondary }}>›</Text>
            </View>
            <View>{children}</View>
        </TouchableOpacity>
    );
}
