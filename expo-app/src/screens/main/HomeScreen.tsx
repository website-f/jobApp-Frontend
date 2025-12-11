import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useColors } from '../../store';

export default function HomeScreen() {
    const { user } = useAuthStore();
    const colors = useColors();
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const isSeeker = user?.user_type === 'seeker';
    const profile = user?.profile;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Header */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                        Hello, {profile?.first_name || 'there'}! 👋
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                        {isSeeker ? 'Ready to find your next opportunity?' : 'Ready to find great talent?'}
                    </Text>
                </View>

                {/* Profile Completeness Card */}
                {isSeeker && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 24,
                        borderWidth: 1,
                        borderColor: colors.primary + '40',
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Profile Completeness</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
                                {(profile as any)?.profile_completeness || 0}%
                            </Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                            <View style={{
                                height: '100%',
                                backgroundColor: colors.primary,
                                borderRadius: 4,
                                width: `${(profile as any)?.profile_completeness || 0}%`,
                            }} />
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            Complete your profile to increase visibility
                        </Text>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Quick Actions</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {isSeeker ? (
                            <>
                                <ActionCard icon="📄" title="Upload Resume" description="Add your latest resume" colors={colors} onPress={() => { }} />
                                <ActionCard icon="💼" title="Browse Jobs" description="Find opportunities" colors={colors} onPress={() => { }} />
                                <ActionCard icon="🎯" title="Update Skills" description="Showcase your expertise" colors={colors} onPress={() => { }} />
                                <ActionCard icon="📅" title="Availability" description="Set your schedule" colors={colors} onPress={() => { }} />
                            </>
                        ) : (
                            <>
                                <ActionCard icon="📝" title="Post a Job" description="Find the right talent" colors={colors} onPress={() => { }} />
                                <ActionCard icon="👥" title="Browse Candidates" description="View available talent" colors={colors} onPress={() => { }} />
                                <ActionCard icon="📊" title="Job Analytics" description="Track your postings" colors={colors} onPress={() => { }} />
                                <ActionCard icon="💳" title="Billing" description="Manage subscriptions" colors={colors} onPress={() => { }} />
                            </>
                        )}
                    </View>
                </View>

                {/* Stats Section */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Your Stats</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {isSeeker ? (
                            <>
                                <StatCard label="Jobs Done" value={(profile as any)?.total_jobs_completed || 0} colors={colors} />
                                <StatCard label="Rating" value={(profile as any)?.overall_rating?.toFixed(1) || '0.0'} colors={colors} />
                                <StatCard label="Skills" value="0" colors={colors} />
                            </>
                        ) : (
                            <>
                                <StatCard label="Jobs Posted" value={(profile as any)?.total_jobs_posted || 0} colors={colors} />
                                <StatCard label="Total Hires" value={(profile as any)?.total_hires || 0} colors={colors} />
                                <StatCard label="Rating" value={(profile as any)?.overall_rating?.toFixed(1) || '0.0'} colors={colors} />
                            </>
                        )}
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Recent Activity</Text>
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        padding: 32,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>No recent activity</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>Your recent actions will appear here</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Action Card Component
function ActionCard({
    icon,
    title,
    description,
    colors,
    onPress,
}: {
    icon: string;
    title: string;
    description: string;
    colors: any;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={{
                width: '48%',
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
            }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{icon}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{description}</Text>
        </TouchableOpacity>
    );
}

// Stat Card Component
function StatCard({ label, value, colors }: { label: string; value: string | number; colors: any }) {
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
