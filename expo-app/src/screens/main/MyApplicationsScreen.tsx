import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../store';
import jobService from '../../services/jobService';
import config from '../../config';

const CURRENCY_SYMBOL = config.settings.currencySymbol;

interface Application {
    id: number;
    job: {
        id: number;
        title: string;
        company_name: string;
        job_type: string;
        location_address: string;
    };
    application_type: 'apply' | 'bid';
    status: 'pending' | 'reviewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
    proposed_rate?: number;
    cover_letter?: string;
    created_at: string;
    reviewed_at?: string;
}

export default function MyApplicationsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    const loadApplications = async () => {
        try {
            const data = await jobService.getMyApplications();
            setApplications(data);
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadApplications();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        loadApplications();
    };

    const handleWithdraw = (application: Application) => {
        if (application.status !== 'pending' && application.status !== 'reviewed') {
            Alert.alert('Cannot Withdraw', 'You can only withdraw pending or reviewed applications.');
            return;
        }

        Alert.alert(
            'Withdraw Application',
            `Are you sure you want to withdraw your application for "${application.job.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await jobService.withdrawApplication(application.id);
                            loadApplications();
                            Alert.alert('Success', 'Application withdrawn successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to withdraw application');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: colors.warningLight || '#FEF3C7', text: colors.warning || '#D97706' };
            case 'reviewed': return { bg: '#E0E7FF', text: '#4F46E5' };
            case 'shortlisted': return { bg: '#DBEAFE', text: '#2563EB' };
            case 'accepted': return { bg: colors.successLight || '#D1FAE5', text: colors.success || '#059669' };
            case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
            case 'withdrawn': return { bg: '#F3F4F6', text: '#6B7280' };
            default: return { bg: colors.border, text: colors.textMuted };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'reviewed': return '👀';
            case 'shortlisted': return '⭐';
            case 'accepted': return '✅';
            case 'rejected': return '❌';
            case 'withdrawn': return '↩️';
            default: return '📝';
        }
    };

    const filteredApplications = applications.filter(app => {
        if (filter === 'all') return true;
        return app.status === filter;
    });

    const renderApplicationItem = ({ item }: { item: Application }) => {
        const statusColors = getStatusColor(item.status);
        const canWithdraw = item.status === 'pending' || item.status === 'reviewed';

        return (
            <View
                style={{
                    backgroundColor: colors.card,
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}
            >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                            {item.job.title}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                            {item.job.company_name}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text, textTransform: 'uppercase' }}>
                            {getStatusIcon(item.status)} {item.status}
                        </Text>
                    </View>
                </View>

                {/* Details */}
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ backgroundColor: colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.text }}>
                            {item.application_type === 'bid' ? '💰 Bid' : '📝 Applied'}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.text }}>
                            {item.job.job_type === 'full_time' ? '🕐 Full Time' : '⏰ Part Time'}
                        </Text>
                    </View>
                    {item.proposed_rate && (
                        <View style={{ backgroundColor: colors.warningLight || '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, color: colors.warning || '#D97706' }}>
                                {CURRENCY_SYMBOL}{item.proposed_rate}/hr
                            </Text>
                        </View>
                    )}
                </View>

                {/* Location */}
                {item.job.location_address && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }} numberOfLines={1}>
                        📍 {item.job.location_address}
                    </Text>
                )}

                {/* Footer */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Applied {new Date(item.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    {canWithdraw && (
                        <TouchableOpacity onPress={() => handleWithdraw(item)}>
                            <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Withdraw</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const FilterChip = ({ label, value }: { label: string; value: string }) => (
        <TouchableOpacity
            style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filter === value ? colors.primary : colors.inputBackground,
                borderWidth: 1,
                borderColor: filter === value ? colors.primary : colors.border,
            }}
            onPress={() => setFilter(value)}
        >
            <Text style={{ fontSize: 13, color: filter === value ? '#FFF' : colors.text, fontWeight: filter === value ? '600' : '400' }}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ padding: 20, paddingBottom: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>My Applications</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
                    Track the status of your job applications
                </Text>
            </View>

            {/* Filters */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { label: 'All', value: 'all' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Reviewed', value: 'reviewed' },
                        { label: 'Shortlisted', value: 'shortlisted' },
                        { label: 'Accepted', value: 'accepted' },
                        { label: 'Rejected', value: 'rejected' },
                    ]}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => <FilterChip label={item.label} value={item.value} />}
                    ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                />
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredApplications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderApplicationItem}
                    contentContainerStyle={{ padding: 20, paddingTop: 8 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
                            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                                {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
                            </Text>
                            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
                                {filter === 'all'
                                    ? 'Start exploring jobs and apply to your dream positions!'
                                    : 'Check other filters or browse more jobs'
                                }
                            </Text>
                            {filter === 'all' && (
                                <TouchableOpacity
                                    style={{ marginTop: 20 }}
                                    onPress={() => navigation.navigate('BrowseJobs')}
                                >
                                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Browse Jobs</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
