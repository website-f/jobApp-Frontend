import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../store';
import jobService, { Job } from '../../services/jobService';
import config from '../../config';

const CURRENCY_SYMBOL = config.settings.currencySymbol;

interface Candidate {
    id: number;
    job_type: 'full_time' | 'part_time';
    seeker_name: string;
    seeker_email: string;
    seeker_phone: string;
    seeker_skills: { id: number; name: string; level: string }[];
    seeker_location?: {
        city?: string;
        state?: string;
        country?: string;
        address?: string;
    };
    seeker_ratings?: {
        overall?: number;
        reliability?: number;
        jobs_completed: number;
        hours_worked: number;
    };
    seeker_avatar?: string;
    seeker_headline?: string;
    seeker_bio?: string;
    application_type: 'apply' | 'bid';
    status: string;
    proposed_rate?: number;
    cover_letter?: string;
    resume_url?: string;
    contract_terms?: any;
    contract_generated_at?: string;
    seeker_signature?: string;
    seeker_signed_at?: string;
    employer_verified_at?: string;
    seeker_acknowledged_at?: string;
    employer_acknowledged_at?: string;
    work_started_at?: string;
    work_completed_at?: string;
    shift_details?: {
        id: number;
        date?: string;
        start_time: string;
        end_time: string;
    };
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

    const updateStatus = async (candidateId: number, newStatus: string) => {
        try {
            await jobService.updateApplicationStatus(candidateId, newStatus);

            // If accepted, prompt to send contract
            if (newStatus === 'accepted') {
                Alert.alert(
                    'Candidate Accepted',
                    'Would you like to send a contract to this candidate now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        {
                            text: 'Send Contract',
                            onPress: () => sendContract(candidateId)
                        }
                    ]
                );
            }

            // Refresh candidates
            if (selectedJob) {
                const data = await jobService.getJobApplications(selectedJob.id);
                setCandidates(data);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const sendContract = async (applicationId: number) => {
        try {
            await jobService.sendContract(applicationId);
            Alert.alert('Success', 'Contract has been sent to the candidate');
            // Refresh candidates
            if (selectedJob) {
                const data = await jobService.getJobApplications(selectedJob.id);
                setCandidates(data);
            }
        } catch (error) {
            console.error('Failed to send contract:', error);
            Alert.alert('Error', 'Failed to send contract');
        }
    };

    const verifyContract = async (applicationId: number) => {
        try {
            await jobService.verifyContract(applicationId);
            Alert.alert('Success', 'Contract has been verified. The candidate can now clock in.');
            // Refresh candidates
            if (selectedJob) {
                const data = await jobService.getJobApplications(selectedJob.id);
                setCandidates(data);
            }
            // Also refresh candidate detail if open
            if (selectedCandidate && selectedCandidate.id === applicationId) {
                setSelectedCandidate({
                    ...selectedCandidate,
                    status: 'contract_acknowledged',
                    employer_verified_at: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Failed to verify contract:', error);
            Alert.alert('Error', 'Failed to verify contract');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return { bg: colors.warningLight || '#FEF3C7', text: colors.warning || '#D97706' };
            case 'reviewed': return { bg: '#E0E7FF', text: '#4F46E5' };
            case 'shortlisted': return { bg: '#DBEAFE', text: '#2563EB' };
            case 'accepted': return { bg: colors.successLight || '#D1FAE5', text: colors.success || '#059669' };
            case 'contract_sent': return { bg: '#FEF3C7', text: '#D97706' };
            case 'contract_acknowledged': return { bg: '#D1FAE5', text: '#059669' };
            case 'active': return { bg: '#DBEAFE', text: '#2563EB' };
            case 'completed': return { bg: '#D1FAE5', text: '#059669' };
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
        navigation.navigate('PostJob', { editJob: job });
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
        const isPartTime = selectedCandidate.job_type === 'part_time';
        const location = selectedCandidate.seeker_location;
        const ratings = selectedCandidate.seeker_ratings;

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
                            {/* Basic Info Card */}
                            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {/* Avatar */}
                                    <View style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 30,
                                        backgroundColor: colors.primary,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: 12,
                                    }}>
                                        <Text style={{ fontSize: 24, color: '#FFF', fontWeight: '700' }}>
                                            {(selectedCandidate.seeker_name || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                                            {selectedCandidate.seeker_name || 'No Name'}
                                        </Text>
                                        {selectedCandidate.seeker_headline && (
                                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                                {selectedCandidate.seeker_headline}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Status Badge */}
                                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: statusColors.text, fontWeight: '600', fontSize: 12, textTransform: 'uppercase' }}>
                                            {selectedCandidate.status.replace('_', ' ')}
                                        </Text>
                                    </View>
                                    {selectedCandidate.application_type === 'bid' && selectedCandidate.proposed_rate && (
                                        <View style={{ backgroundColor: colors.warningLight || '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ color: colors.warning || '#D97706', fontWeight: '600', fontSize: 12 }}>
                                                Bid: {CURRENCY_SYMBOL}{selectedCandidate.proposed_rate}/hr
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Contact Info */}
                                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                                    {selectedCandidate.seeker_email && (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                                            onPress={() => Linking.openURL(`mailto:${selectedCandidate.seeker_email}`)}
                                        >
                                            <Ionicons name="mail-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                            <Text style={{ fontSize: 14, color: colors.primary }}>{selectedCandidate.seeker_email}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {selectedCandidate.seeker_phone && (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                                            onPress={() => Linking.openURL(`tel:${selectedCandidate.seeker_phone}`)}
                                        >
                                            <Ionicons name="call-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                            <Text style={{ fontSize: 14, color: colors.primary }}>{selectedCandidate.seeker_phone}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {location && (location.city || location.state) && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                                                {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Ratings & Stats */}
                            {ratings && (ratings.overall || ratings.jobs_completed > 0) && (
                                <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Ratings & Experience</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                                        {ratings.overall && (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.warning || '#F59E0B' }}>
                                                    ⭐ {ratings.overall.toFixed(1)}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Rating</Text>
                                            </View>
                                        )}
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
                                                {ratings.jobs_completed}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Jobs Done</Text>
                                        </View>
                                        {ratings.reliability && (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.success || '#10B981' }}>
                                                    {ratings.reliability.toFixed(0)}%
                                                </Text>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Reliability</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Skills */}
                            {selectedCandidate.seeker_skills && selectedCandidate.seeker_skills.length > 0 && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Skills</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {selectedCandidate.seeker_skills.map(skill => (
                                            <View key={skill.id} style={{
                                                backgroundColor: colors.primaryLight || '#EEF2FF',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                            }}>
                                                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>{skill.name}</Text>
                                                {skill.level && (
                                                    <Text style={{ color: colors.primary, fontSize: 10, marginLeft: 4, opacity: 0.7 }}>
                                                        ({skill.level})
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Bio */}
                            {selectedCandidate.seeker_bio && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>About</Text>
                                    <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                        <Text style={{ color: colors.text, lineHeight: 20 }}>{selectedCandidate.seeker_bio}</Text>
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
                                    <Ionicons name="document-text" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>View Resume</Text>
                                        <Text style={{ color: colors.primary, fontSize: 12 }}>Tap to open</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}

                            {/* Part-Time Flow: Send Contract Button - Show when accepted */}
                            {isPartTime && selectedCandidate.status === 'accepted' && (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.success || '#059669',
                                        padding: 16,
                                        borderRadius: 12,
                                        marginBottom: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    onPress={() => sendContract(selectedCandidate.id)}
                                >
                                    <Ionicons name="document-text" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Send Contract</Text>
                                </TouchableOpacity>
                            )}

                            {/* Contract Sent Status - Awaiting Signature */}
                            {selectedCandidate.status === 'contract_sent' && !selectedCandidate.seeker_signed_at && (
                                <View style={{
                                    backgroundColor: colors.warningLight || '#FEF3C7',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}>
                                    <Ionicons name="time" size={20} color={colors.warning || '#D97706'} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.warning || '#D97706', fontWeight: '600', flex: 1 }}>
                                        Waiting for candidate to sign contract
                                    </Text>
                                </View>
                            )}

                            {/* Contract Signed - Needs Verification */}
                            {selectedCandidate.status === 'contract_sent' && selectedCandidate.seeker_signed_at && !selectedCandidate.employer_verified_at && (
                                <View style={{ marginBottom: 16 }}>
                                    <View style={{
                                        backgroundColor: colors.primaryLight || '#EEF2FF',
                                        padding: 16,
                                        borderRadius: 12,
                                        marginBottom: 8,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <Ionicons name="create" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Contract Signed</Text>
                                        </View>
                                        <Text style={{ color: colors.text, fontSize: 13 }}>
                                            Signature: <Text style={{ fontWeight: '600', fontStyle: 'italic' }}>{selectedCandidate.seeker_signature}</Text>
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                                            Signed at: {new Date(selectedCandidate.seeker_signed_at!).toLocaleString()}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.success || '#059669',
                                            padding: 16,
                                            borderRadius: 12,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        onPress={() => verifyContract(selectedCandidate.id)}
                                    >
                                        <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Verify Contract</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Contract Verified - Can Start Work */}
                            {selectedCandidate.status === 'contract_acknowledged' && (
                                <View style={{
                                    backgroundColor: colors.successLight || '#D1FAE5',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Ionicons name="checkmark-circle" size={20} color={colors.success || '#059669'} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.success || '#059669', fontWeight: '700' }}>Contract Verified</Text>
                                    </View>
                                    <Text style={{ color: colors.success || '#059669', fontSize: 13 }}>
                                        Candidate can now clock in when their shift starts.
                                    </Text>
                                    {selectedCandidate.shift_details && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                                            Shift: {selectedCandidate.shift_details.date || 'Recurring'} • {selectedCandidate.shift_details.start_time} - {selectedCandidate.shift_details.end_time}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Active - Currently Working */}
                            {selectedCandidate.status === 'active' && (
                                <View style={{
                                    backgroundColor: '#DBEAFE',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Ionicons name="play-circle" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#2563EB', fontWeight: '700' }}>Currently Working</Text>
                                    </View>
                                    {selectedCandidate.work_started_at && (
                                        <Text style={{ color: '#2563EB', fontSize: 13 }}>
                                            Clocked in at: {new Date(selectedCandidate.work_started_at).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Completed */}
                            {selectedCandidate.status === 'completed' && (
                                <View style={{
                                    backgroundColor: colors.successLight || '#D1FAE5',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Ionicons name="checkmark-done-circle" size={20} color={colors.success || '#059669'} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.success || '#059669', fontWeight: '700' }}>Job Completed</Text>
                                    </View>
                                    {selectedCandidate.work_completed_at && (
                                        <Text style={{ color: colors.success || '#059669', fontSize: 13 }}>
                                            Completed at: {new Date(selectedCandidate.work_completed_at).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Status Actions */}
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Update Status</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                                Current: <Text style={{ fontWeight: '600', color: statusColors.text }}>{selectedCandidate.status.replace('_', ' ')}</Text>
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                                {['reviewed', 'shortlisted', 'accepted', 'rejected'].map(s => {
                                    const isActive = selectedCandidate.status === s;
                                    const btnColors = getStatusColor(s);
                                    return (
                                        <TouchableOpacity
                                            key={s}
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                borderRadius: 8,
                                                backgroundColor: isActive ? btnColors.bg : colors.inputBackground,
                                                borderWidth: 2,
                                                borderColor: isActive ? btnColors.text : colors.border,
                                            }}
                                            onPress={() => {
                                                updateStatus(selectedCandidate.id, s);
                                                setSelectedCandidate({ ...selectedCandidate, status: s });
                                            }}
                                        >
                                            <Text style={{
                                                color: isActive ? btnColors.text : colors.text,
                                                fontWeight: isActive ? '700' : '500',
                                                textTransform: 'capitalize'
                                            }}>
                                                {isActive ? `✓ ${s}` : s}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
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
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {/* Native-style Header with proper padding */}
                <View style={{
                    backgroundColor: colors.background,
                    paddingTop: Platform.OS === 'ios' ? 50 : 40,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}>
                    <View style={{
                        paddingHorizontal: 16,
                        paddingBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        minHeight: 44,
                    }}>
                        <TouchableOpacity
                            onPress={() => { setShowCandidates(false); setSelectedJob(null); setCandidates([]); }}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: colors.inputBackground,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12,
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>Candidates</Text>
                    </View>
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

                {renderCandidateDetail()}
            </View>
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
