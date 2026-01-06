import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useAuthStore } from '../../store';
import jobService from '../../services/jobService';
import config from '../../config';

const CURRENCY_SYMBOL = config.settings.currencySymbol;

// Custom Modal Component for alerts
interface AlertModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
    visible,
    type,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
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
            case 'confirm':
                return { icon: 'help-circle' as const, color: colors.primary };
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
                    {type === 'confirm' ? (
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.border,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                }}
                                onPress={onClose}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{cancelText}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: color,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                }}
                                onPress={onConfirm}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600' }}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
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
                            <Text style={{ color: '#FFF', fontWeight: '600' }}>{confirmText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

interface Application {
    id: number;
    job: number;
    job_title: string;
    company_name: string;
    job_type: 'full_time' | 'part_time';
    application_type: 'apply' | 'bid';
    status: string;
    proposed_rate?: number;
    cover_letter?: string;
    contract_terms?: {
        job_title?: string;
        company?: string;
        location?: string;
        hourly_rate?: string;
        job_type?: string;
        start_date?: string;
        start_time?: string;
        end_time?: string;
        terms_accepted?: boolean;
    };
    contract_generated_at?: string;
    seeker_signature?: string;
    seeker_signed_at?: string;
    employer_verified_at?: string;
    seeker_acknowledged_at?: string;
    shift_details?: {
        id: number;
        date?: string;
        day_of_week?: number;
        start_time: string;
        end_time: string;
        hourly_rate?: number;
    };
    created_at: string;
    reviewed_at?: string;
}

export default function MyApplicationsScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { user } = useAuthStore();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    // Contract modal state
    const [showContractModal, setShowContractModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [signature, setSignature] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    // Alert modal state
    const [alertModal, setAlertModal] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ visible: false, type: 'success', title: '', message: '' });

    const showAlert = (
        type: 'success' | 'error' | 'warning' | 'confirm',
        title: string,
        message: string,
        onConfirm?: () => void
    ) => {
        setAlertModal({ visible: true, type, title, message, onConfirm });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, visible: false }));
    };

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
            showAlert('warning', 'Cannot Withdraw', 'You can only withdraw pending or reviewed applications.');
            return;
        }

        showAlert(
            'confirm',
            'Withdraw Application',
            `Are you sure you want to withdraw your application for "${application.job_title}"?`,
            async () => {
                closeAlert();
                try {
                    await jobService.withdrawApplication(application.id);
                    loadApplications();
                    showAlert('success', 'Withdrawn', 'Your application has been withdrawn successfully.');
                } catch (error) {
                    showAlert('error', 'Error', 'Failed to withdraw application. Please try again.');
                }
            }
        );
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
            case 'withdrawn': return { bg: '#F3F4F6', text: '#6B7280' };
            default: return { bg: colors.border, text: colors.textMuted };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'reviewed': return 'eye-outline';
            case 'shortlisted': return 'star-outline';
            case 'accepted': return 'checkmark-circle-outline';
            case 'contract_sent': return 'document-text-outline';
            case 'contract_acknowledged': return 'handshake-outline';
            case 'active': return 'play-circle-outline';
            case 'completed': return 'checkmark-done-outline';
            case 'rejected': return 'close-circle-outline';
            case 'withdrawn': return 'arrow-undo-outline';
            default: return 'document-outline';
        }
    };

    const getStatusMessage = (item: Application) => {
        switch (item.status) {
            case 'accepted':
                return 'Waiting for employer to send contract';
            case 'contract_sent':
                if (item.seeker_signed_at && !item.employer_verified_at) {
                    return '✍️ Contract signed! Awaiting employer verification';
                }
                return '📝 Contract ready! Please review and sign';
            case 'contract_acknowledged':
                return '✅ Contract verified! You can now clock in when your shift starts';
            case 'active':
                return '🔵 Work in progress';
            case 'completed':
                return '✓ Job completed';
            default:
                return null;
        }
    };

    const handleViewContract = (application: Application) => {
        setSelectedApplication(application);
        setSignature('');
        setShowContractModal(true);
    };

    const handleSignContract = async () => {
        if (!selectedApplication) return;

        const fullName = user?.profile?.first_name
            ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
            : user?.email?.split('@')[0] || '';

        if (!signature.trim()) {
            showAlert('warning', 'Signature Required', 'Please type your full name to sign the contract.');
            return;
        }

        if (signature.trim().toLowerCase() !== fullName.toLowerCase()) {
            showAlert('warning', 'Signature Mismatch', `Please type your full name exactly as: "${fullName}"`);
            return;
        }

        setIsSigning(true);
        try {
            await jobService.signContract(selectedApplication.id, signature.trim());
            setShowContractModal(false);
            setSelectedApplication(null);
            setSignature('');
            loadApplications();
            showAlert(
                'success',
                'Contract Signed',
                'Your contract has been signed successfully. The employer will verify it shortly, and then you can start work.'
            );
        } catch (error) {
            console.error('Failed to sign contract:', error);
            showAlert('error', 'Signing Failed', 'Failed to sign contract. Please try again.');
        } finally {
            setIsSigning(false);
        }
    };

    const handleClockIn = (applicationId: number) => {
        navigation.navigate('ClockInOut', { applicationId });
    };

    const filteredApplications = applications.filter(app => {
        if (filter === 'all') return true;
        return app.status === filter;
    });

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeString?: string) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Contract View Modal
    const renderContractModal = () => {
        if (!selectedApplication) return null;

        const contract = selectedApplication.contract_terms || {};
        const fullName = user?.profile?.first_name
            ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
            : user?.email?.split('@')[0] || '';

        return (
            <Modal visible={showContractModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '90%',
                    }}>
                        {/* Header */}
                        <View style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <View>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Employment Contract</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Please review and sign below</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowContractModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {/* Contract Header */}
                            <View style={{
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                            }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                                    EMPLOYMENT AGREEMENT
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                                    Generated on {formatDate(selectedApplication.contract_generated_at)}
                                </Text>
                            </View>

                            {/* Parties */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Parties</Text>
                                <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 13, color: colors.text }}>
                                        <Text style={{ fontWeight: '600' }}>Employer: </Text>
                                        {contract.company || selectedApplication.company_name}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                                        <Text style={{ fontWeight: '600' }}>Employee: </Text>
                                        {fullName}
                                    </Text>
                                </View>
                            </View>

                            {/* Job Details */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Position Details</Text>
                                <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Position:</Text>
                                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{contract.job_title || selectedApplication.job_title}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Type:</Text>
                                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                                            {(contract.job_type || selectedApplication.job_type) === 'part_time' ? 'Part-Time' : 'Full-Time'}
                                        </Text>
                                    </View>
                                    {contract.location && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Location:</Text>
                                            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' }} numberOfLines={2}>
                                                {contract.location}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Compensation */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Compensation</Text>
                                <View style={{ backgroundColor: colors.successLight || '#D1FAE5', padding: 12, borderRadius: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 13, color: colors.success || '#059669' }}>Hourly Rate:</Text>
                                        <Text style={{ fontSize: 18, color: colors.success || '#059669', fontWeight: '700' }}>
                                            {CURRENCY_SYMBOL}{contract.hourly_rate || selectedApplication.proposed_rate}/hr
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Schedule */}
                            {(contract.start_date || contract.start_time) && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Schedule</Text>
                                    <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                        {contract.start_date && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Start Date:</Text>
                                                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{formatDate(contract.start_date)}</Text>
                                            </View>
                                        )}
                                        {contract.start_time && contract.end_time && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Working Hours:</Text>
                                                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                                                    {formatTime(contract.start_time)} - {formatTime(contract.end_time)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Terms and Conditions */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Terms and Conditions</Text>
                                <View style={{ backgroundColor: colors.inputBackground, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                                        1. The Employee agrees to perform the duties assigned by the Employer.{'\n\n'}
                                        2. The Employee will be compensated at the agreed hourly rate for all approved work hours.{'\n\n'}
                                        3. The Employee must clock in and out accurately to record work hours.{'\n\n'}
                                        4. Either party may terminate this agreement with reasonable notice.{'\n\n'}
                                        5. The Employee agrees to maintain confidentiality regarding the Employer's business.
                                    </Text>
                                </View>
                            </View>

                            {/* E-Signature Section */}
                            <View style={{
                                marginBottom: 32,
                                backgroundColor: colors.card,
                                padding: 16,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: colors.primary,
                            }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                                    Electronic Signature
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                                    Type your full name exactly as "{fullName}" to sign this contract
                                </Text>

                                <TextInput
                                    style={{
                                        backgroundColor: colors.background,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 8,
                                        padding: 12,
                                        fontSize: 16,
                                        color: colors.text,
                                        fontStyle: 'italic',
                                    }}
                                    placeholder="Type your full name here..."
                                    placeholderTextColor={colors.textMuted}
                                    value={signature}
                                    onChangeText={setSignature}
                                    autoCapitalize="words"
                                />

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                                    <Ionicons name="shield-checkmark" size={16} color={colors.success || '#059669'} />
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 6 }}>
                                        Your signature is legally binding and confirms your agreement to the terms above.
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Sign Button */}
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: signature.trim() ? (colors.success || '#059669') : colors.border,
                                    padding: 16,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onPress={handleSignContract}
                                disabled={!signature.trim() || isSigning}
                            >
                                {isSigning ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="create-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Sign & Acknowledge Contract</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Check if current time is within shift schedule
    const isWithinShiftTime = (item: Application): boolean => {
        if (!item.shift_details) return true; // Allow if no shift details

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if shift is for today
        if (item.shift_details.date && item.shift_details.date !== today) {
            return false;
        }

        // Check if current time is within 30 minutes of start time or during shift
        const [startHours, startMinutes] = item.shift_details.start_time.split(':').map(Number);
        const [endHours, endMinutes] = item.shift_details.end_time.split(':').map(Number);

        const shiftStart = new Date(now);
        shiftStart.setHours(startHours, startMinutes, 0, 0);

        const shiftEnd = new Date(now);
        shiftEnd.setHours(endHours, endMinutes, 0, 0);

        // Allow clock in 30 minutes before shift starts
        const earlyWindow = new Date(shiftStart.getTime() - 30 * 60 * 1000);

        return now >= earlyWindow && now <= shiftEnd;
    };

    const renderApplicationItem = ({ item }: { item: Application }) => {
        const statusColors = getStatusColor(item.status);
        const canWithdraw = item.status === 'pending' || item.status === 'reviewed';
        const statusMessage = getStatusMessage(item);

        // Can view contract: status is contract_sent AND not yet signed
        const canViewContract = item.status === 'contract_sent' && !item.seeker_signed_at;

        // Waiting for verification: signed but not verified
        const awaitingVerification = item.status === 'contract_sent' && item.seeker_signed_at && !item.employer_verified_at;

        // Can clock in: contract is verified (acknowledged) and within shift time
        const canClockIn = item.status === 'contract_acknowledged' || item.status === 'active';
        const clockInEnabled = canClockIn && isWithinShiftTime(item);

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
                            {item.job_title}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                            {item.company_name}
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: statusColors.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <Ionicons name={getStatusIcon(item.status) as any} size={12} color={statusColors.text} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: statusColors.text, textTransform: 'uppercase' }}>
                            {item.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                {/* Status Message */}
                {statusMessage && (
                    <View style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: statusColors.bg,
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: statusColors.text,
                    }}>
                        <Text style={{ fontSize: 13, color: statusColors.text, fontWeight: '500' }}>
                            {statusMessage}
                        </Text>
                    </View>
                )}

                {/* Details */}
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ backgroundColor: colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.text }}>
                            {item.application_type === 'bid' ? 'Bid' : 'Applied'}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.text }}>
                            {item.job_type === 'full_time' ? 'Full Time' : 'Part Time'}
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

                {/* Action Buttons */}
                {(canViewContract || awaitingVerification || canClockIn) && (
                    <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                        {canViewContract && (
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.primary,
                                    padding: 12,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onPress={() => handleViewContract(item)}
                            >
                                <Ionicons name="document-text" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>View & Sign Contract</Text>
                            </TouchableOpacity>
                        )}
                        {awaitingVerification && (
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.warningLight || '#FEF3C7',
                                    padding: 12,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="hourglass" size={18} color={colors.warning || '#D97706'} style={{ marginRight: 6 }} />
                                <Text style={{ color: colors.warning || '#D97706', fontWeight: '600', fontSize: 14 }}>Awaiting Verification</Text>
                            </View>
                        )}
                        {canClockIn && (
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: clockInEnabled ? colors.primary : colors.border,
                                    padding: 12,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onPress={() => clockInEnabled ? handleClockIn(item.id) : showAlert(
                                    'warning',
                                    'Clock In Not Available',
                                    'You can only clock in 30 minutes before your shift starts and during your scheduled work time.'
                                )}
                            >
                                <Ionicons name="time" size={18} color={clockInEnabled ? '#FFF' : colors.textMuted} style={{ marginRight: 6 }} />
                                <Text style={{ color: clockInEnabled ? '#FFF' : colors.textMuted, fontWeight: '600', fontSize: 14 }}>
                                    {clockInEnabled ? 'Clock In' : 'Not Shift Time'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.inputBackground,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>My Applications</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                            Track the status of your job applications
                        </Text>
                    </View>
                </View>
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
                        { label: 'Contract', value: 'contract_sent' },
                        { label: 'Active', value: 'active' },
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
                            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
                            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
                                {filter === 'all' ? 'No applications yet' : `No ${filter.replace('_', ' ')} applications`}
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

            {/* Contract Modal */}
            {renderContractModal()}

            {/* Alert Modal */}
            <AlertModal
                visible={alertModal.visible}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={closeAlert}
                onConfirm={alertModal.onConfirm}
                confirmText={alertModal.type === 'confirm' ? 'Withdraw' : 'OK'}
                cancelText="Cancel"
            />
        </SafeAreaView>
    );
}
