import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../../store';
import jobService, { Job } from '../../services/jobService';
import config from '../../config';

const CURRENCY_SYMBOL = config.settings.currencySymbol;

interface Candidate {
    id: number;
    seeker_name: string;
    seeker_email: string;
    seeker_phone: string;
    seeker_skills: { id: number; name: string; level: string }[];
    application_type: 'apply' | 'bid';
    status: string;
    proposed_rate?: number;
    cover_letter?: string;
    resume_url?: string;
    created_at: string;
}

export default function EmployerJobsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Candidate modal state
    const [showCandidates, setShowCandidates] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    const loadJobs = async () => {
        try {
            const data = await jobService.getEmployerJobs();
            setJobs(data);
        } catch (error) {
            console.error('Failed to load employer jobs:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadJobs();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        loadJobs();
    };

    const openCandidates = async (job: Job) => {
        setSelectedJob(job);
        setShowCandidates(true);
        setLoadingCandidates(true);

        try {
            const data = await jobService.getJobApplications(job.id);
            setCandidates(data);
        } catch (error) {
            console.error('Failed to load candidates:', error);
            setCandidates([]);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const updateStatus = async (candidateId: number, status: string) => {
        try {
            await jobService.updateApplicationStatus(candidateId, status);
            // Refresh candidates
            if (selectedJob) {
                const data = await jobService.getJobApplications(selectedJob.id);
                setCandidates(data);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: colors.warningLight || '#FEF3C7', text: colors.warning || '#D97706' };
            case 'reviewed': return { bg: '#E0E7FF', text: '#4F46E5' };
            case 'shortlisted': return { bg: '#DBEAFE', text: '#2563EB' };
            case 'accepted': return { bg: colors.successLight || '#D1FAE5', text: colors.success || '#059669' };
            case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
            default: return { bg: colors.border, text: colors.textMuted };
        }
    };

    const handleDeleteJob = (job: Job) => {
        Alert.alert(
            'Delete Job',
            `Are you sure you want to delete "${job.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await jobService.deleteJob(job.id);
                            // Refresh list
                            loadJobs();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete job');
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleEditJob = (job: Job) => {
        Alert.alert('Info', 'To edit this job, please delete it and post a new one for now.');
    };

    const renderJobItem = ({ item }: { item: Job }) => (
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
            <TouchableOpacity onPress={() => openCandidates(item)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>{item.title}</Text>
                    <View style={{
                        backgroundColor: item.is_active ? colors.successLight : colors.border,
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8
                    }}>
                        <Text style={{
                            fontSize: 10, fontWeight: '600',
                            color: item.is_active ? colors.success : colors.textMuted
                        }}>
                            {item.is_active ? 'ACTIVE' : 'CLOSED'}
                        </Text>
                    </View>
                </View>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{item.company_name}</Text>

                <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        📅 Posted {new Date(item.posted_at).toLocaleDateString('en-MY')}
                    </Text>
                    {item.job_type === 'part_time' && (
                        <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 10, fontWeight: '500' }}>
                            • Part Time
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, justifyContent: 'space-between' }}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => openCandidates(item)}
                >
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                        👥 Candidates ({item.id ? 'View' : '0'})
                    </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => handleEditJob(item)}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>✎ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteJob(item)}>
                        <Text style={{ fontSize: 13, color: '#EF4444' }}>🗑️ Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // Candidate Detail View
    const renderCandidateDetail = () => {
        if (!selectedCandidate) return null;

        const statusColors = getStatusColor(selectedCandidate.status);

        return (
            <Modal visible={!!selectedCandidate} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '90%',
                    }}>
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Candidate Details</Text>
                            <TouchableOpacity onPress={() => setSelectedCandidate(null)}>
                                <Text style={{ fontSize: 24, color: colors.textMuted }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {/* Basic Info */}
                            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 16 }}>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{selectedCandidate.seeker_name || 'No Name'}</Text>
                                <View style={{ marginTop: 8 }}>
                                    {selectedCandidate.seeker_email && (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                                            onPress={() => Linking.openURL(`mailto:${selectedCandidate.seeker_email}`)}
                                        >
                                            <Text style={{ fontSize: 14, color: colors.primary }}>📧 {selectedCandidate.seeker_email}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {selectedCandidate.seeker_phone && (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center' }}
                                            onPress={() => Linking.openURL(`tel:${selectedCandidate.seeker_phone}`)}
                                        >
                                            <Text style={{ fontSize: 14, color: colors.primary }}>📱 {selectedCandidate.seeker_phone}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Status Badge */}
                                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: statusColors.text, fontWeight: '600', fontSize: 12, textTransform: 'uppercase' }}>
                                            {selectedCandidate.status}
                                        </Text>
                                    </View>
                                    {selectedCandidate.application_type === 'bid' && selectedCandidate.proposed_rate && (
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>
                                            Bid: {CURRENCY_SYMBOL}{selectedCandidate.proposed_rate}/hr
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Skills */}
                            {selectedCandidate.seeker_skills && selectedCandidate.seeker_skills.length > 0 && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Skills</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {selectedCandidate.seeker_skills.map(skill => (
                                            <View key={skill.id} style={{ backgroundColor: colors.primaryLight || '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                                <Text style={{ color: colors.primary, fontSize: 12 }}>{skill.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Cover Letter */}
                            {selectedCandidate.cover_letter && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Cover Letter</Text>
                                    <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                        <Text style={{ color: colors.text, lineHeight: 20 }}>{selectedCandidate.cover_letter}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Resume */}
                            {selectedCandidate.resume_url && (
                                <TouchableOpacity
                                    style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => Linking.openURL(selectedCandidate.resume_url!)}
                                >
                                    <Text style={{ fontSize: 24, marginRight: 12 }}>📄</Text>
                                    <View>
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>View Resume</Text>
                                        <Text style={{ color: colors.primary, fontSize: 12 }}>Tap to open</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Status Actions */}
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Update Status</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                                {['reviewed', 'shortlisted', 'accepted', 'rejected'].map(status => (
                                    <TouchableOpacity
                                        key={status}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 8,
                                            backgroundColor: selectedCandidate.status === status ? colors.primary : colors.inputBackground,
                                            borderWidth: 1,
                                            borderColor: selectedCandidate.status === status ? colors.primary : colors.border,
                                        }}
                                        onPress={() => {
                                            updateStatus(selectedCandidate.id, status);
                                            setSelectedCandidate({ ...selectedCandidate, status });
                                        }}
                                    >
                                        <Text style={{
                                            color: selectedCandidate.status === status ? '#FFF' : colors.text,
                                            fontWeight: '600',
                                            textTransform: 'capitalize'
                                        }}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    // Candidates List Modal
    const renderCandidatesModal = () => (
        <Modal visible={showCandidates} animationType="slide">
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { setShowCandidates(false); setSelectedJob(null); setCandidates([]); }}>
                        <Text style={{ fontSize: 16, color: colors.primary }}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Candidates</Text>
                    <View style={{ width: 60 }} />
                </View>

                {selectedJob && (
                    <View style={{ padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{selectedJob.title}</Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{selectedJob.company_name}</Text>
                    </View>
                )}

                {loadingCandidates ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : candidates.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 40, marginBottom: 16 }}>👤</Text>
                        <Text style={{ fontSize: 16, color: colors.textSecondary }}>No candidates yet</Text>
                        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Share this job to attract more applicants</Text>
                    </View>
                ) : (
                    <FlatList
                        data={candidates}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => {
                            const statusColors = getStatusColor(item.status);
                            return (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.card,
                                        padding: 16,
                                        marginBottom: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder,
                                    }}
                                    onPress={() => setSelectedCandidate(item)}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.seeker_name || 'Unknown'}</Text>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.seeker_email}</Text>
                                        </View>
                                        <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: statusColors.text, textTransform: 'uppercase' }}>
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                                        <View style={{ backgroundColor: colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 11, color: colors.text }}>
                                                {item.application_type === 'bid' ? '💰 Bid' : '📝 Applied'}
                                            </Text>
                                        </View>
                                        {item.proposed_rate && (
                                            <View style={{ backgroundColor: colors.warningLight || '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 11, color: colors.warning || '#D97706' }}>
                                                    {CURRENCY_SYMBOL}{item.proposed_rate}/hr
                                                </Text>
                                            </View>
                                        )}
                                        {item.resume_url && (
                                            <View style={{ backgroundColor: colors.primaryLight || '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 11, color: colors.primary }}>📄 Has Resume</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                                        Applied {new Date(item.created_at).toLocaleDateString('en-MY')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>

            {renderCandidateDetail()}
        </Modal>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>My Jobs</Text>
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                    }}
                    onPress={() => navigation.navigate('PostJob')}
                >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>+ Post Job</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={(item) => item.uuid}
                    renderItem={renderJobItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 16 }}>📝</Text>
                            <Text style={{ fontSize: 16, color: colors.textSecondary }}>You haven't posted any jobs yet.</Text>
                            <TouchableOpacity
                                style={{ marginTop: 20 }}
                                onPress={() => navigation.navigate('PostJob')}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Post your first job</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {renderCandidatesModal()}
        </SafeAreaView>
    );
}
