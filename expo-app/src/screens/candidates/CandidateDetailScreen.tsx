import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import candidateService, { CandidateDetail } from '../../services/candidateService';

type RouteParams = {
    CandidateDetail: {
        uuid: string;
        candidate?: any;
    };
};

export default function CandidateDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'CandidateDetail'>>();
    const colors = useColors();
    const { t } = useTranslation();

    const { uuid, candidate: initialCandidate } = route.params;
    const [loading, setLoading] = useState(!initialCandidate);
    const [candidate, setCandidate] = useState<CandidateDetail | null>(initialCandidate || null);

    useEffect(() => {
        if (!initialCandidate) {
            loadCandidate();
        } else {
            // Load full details if we only have basic data
            loadCandidate();
        }
    }, [uuid]);

    const loadCandidate = async () => {
        try {
            const detail = await candidateService.getCandidateDetail(uuid);
            setCandidate(detail);
        } catch (error) {
            console.error('Error loading candidate:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = () => {
        // Navigate to messaging/chat with user_id for creating new conversation
        if (!candidate?.user_id) {
            console.error('No user_id available for messaging');
            return;
        }
        navigation.navigate('Chat', {
            conversationId: null,
            recipientId: candidate.user_id,
            recipientName: candidate?.name,
        });
    };

    const getAvailabilityColor = (status?: string) => {
        switch (status) {
            case 'available': return colors.success;
            case 'busy': return colors.warning;
            default: return colors.textMuted;
        }
    };

    const getAvailabilityLabel = (status?: string) => {
        switch (status) {
            case 'available': return 'Available Now';
            case 'busy': return 'Currently Busy';
            default: return 'Not Available';
        }
    };

    const getProficiencyColor = (level: string) => {
        switch (level) {
            case 'expert': return colors.success;
            case 'advanced': return colors.primary;
            case 'intermediate': return colors.warning;
            default: return colors.textMuted;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!candidate) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                    <Ionicons name="person-outline" size={64} color={colors.textMuted} />
                    <Text style={{ fontSize: typography.fontSize.lg, color: colors.text, marginTop: spacing.md }}>
                        Candidate not found
                    </Text>
                    <TouchableOpacity
                        style={{ marginTop: spacing.lg }}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={{ color: colors.primary }}>Go Back</Text>
                    </TouchableOpacity>
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
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{
                    flex: 1,
                    fontSize: typography.fontSize.lg,
                    fontWeight: '600',
                    color: colors.text,
                    marginLeft: spacing.md,
                }}>
                    Candidate Profile
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.base }}>
                {/* Profile Header */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    <View style={{ flexDirection: 'row' }}>
                        {/* Avatar */}
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: colors.primaryLight,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: spacing.lg,
                        }}>
                            {candidate.avatar_url ? (
                                <Image
                                    source={{ uri: candidate.avatar_url }}
                                    style={{ width: 80, height: 80, borderRadius: 40 }}
                                />
                            ) : (
                                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.primary }}>
                                    {candidate.name?.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Text style={{
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: '700',
                                    color: colors.text,
                                }}>
                                    {candidate.name}
                                </Text>
                                {candidate.verification?.is_verified && (
                                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: spacing.xs }} />
                                )}
                                {candidate.verification?.is_premium && (
                                    <Ionicons name="diamond" size={18} color={colors.warning} style={{ marginLeft: spacing.xs }} />
                                )}
                            </View>
                            {candidate.headline && (
                                <Text style={{ fontSize: typography.fontSize.base, color: colors.textSecondary, marginTop: 4 }}>
                                    {candidate.headline}
                                </Text>
                            )}
                            {candidate.location?.city && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginLeft: 4 }}>
                                        {[candidate.location.city, candidate.location.state, candidate.location.country]
                                            .filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                            )}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: spacing.sm,
                                backgroundColor: getAvailabilityColor(candidate.availability?.status) + '20',
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 4,
                                borderRadius: borderRadius.sm,
                                alignSelf: 'flex-start',
                            }}>
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: getAvailabilityColor(candidate.availability?.status),
                                    marginRight: spacing.xs,
                                }} />
                                <Text style={{
                                    fontSize: typography.fontSize.sm,
                                    color: getAvailabilityColor(candidate.availability?.status),
                                    fontWeight: '500',
                                }}>
                                    {getAvailabilityLabel(candidate.availability?.status)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact Button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingVertical: spacing.md,
                            borderRadius: borderRadius.base,
                            alignItems: 'center',
                            marginTop: spacing.lg,
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                        onPress={handleMessage}
                    >
                        <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base, marginLeft: spacing.sm }}>
                            Message Candidate
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                }}>
                    {/* Rating */}
                    <View style={{
                        flex: 1,
                        minWidth: '45%',
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        alignItems: 'center',
                    }}>
                        <Ionicons name="star" size={24} color={colors.warning} />
                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
                            {candidate.ratings?.overall?.toFixed(1) || 'N/A'}
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Rating</Text>
                    </View>

                    {/* Jobs Completed */}
                    <View style={{
                        flex: 1,
                        minWidth: '45%',
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        alignItems: 'center',
                    }}>
                        <Ionicons name="briefcase" size={24} color={colors.primary} />
                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
                            {candidate.stats?.jobs_completed || 0}
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Jobs Done</Text>
                    </View>

                    {/* Hours Worked */}
                    <View style={{
                        flex: 1,
                        minWidth: '45%',
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        alignItems: 'center',
                    }}>
                        <Ionicons name="time" size={24} color={colors.success} />
                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
                            {Math.round(candidate.stats?.hours_worked || 0)}h
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Hours</Text>
                    </View>

                    {/* Reliability */}
                    <View style={{
                        flex: 1,
                        minWidth: '45%',
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        alignItems: 'center',
                    }}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.info || colors.primary} />
                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
                            {candidate.ratings?.reliability?.toFixed(0) || 'N/A'}%
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Reliable</Text>
                    </View>
                </View>

                {/* Hourly Rate */}
                {(candidate.rates?.min || candidate.rates?.max) && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cash-outline" size={20} color={colors.success} />
                            <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
                                Expected Rate
                            </Text>
                        </View>
                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.success, marginTop: spacing.sm }}>
                            {candidate.rates.currency} {candidate.rates.min} - {candidate.rates.max} / hour
                        </Text>
                    </View>
                )}

                {/* Bio */}
                {candidate.bio && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                            About
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.base, color: colors.textSecondary, lineHeight: 22 }}>
                            {candidate.bio}
                        </Text>
                    </View>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
                            Skills ({candidate.skills.length})
                        </Text>
                        <View style={{ gap: spacing.sm }}>
                            {candidate.skills.map((skill, index) => (
                                <View
                                    key={index}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: spacing.sm,
                                        borderBottomWidth: index < candidate.skills.length - 1 ? 1 : 0,
                                        borderBottomColor: colors.border,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: typography.fontSize.base, color: colors.text, fontWeight: skill.is_primary ? '600' : '400' }}>
                                                {skill.name}
                                            </Text>
                                            {skill.is_primary && (
                                                <View style={{
                                                    backgroundColor: colors.warning + '20',
                                                    paddingHorizontal: spacing.xs,
                                                    paddingVertical: 2,
                                                    borderRadius: borderRadius.sm,
                                                    marginLeft: spacing.xs,
                                                }}>
                                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning }}>Primary</Text>
                                                </View>
                                            )}
                                            {skill.is_verified && (
                                                <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 4 }} />
                                            )}
                                        </View>
                                        {skill.category && (
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                                {skill.category}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <View style={{
                                            backgroundColor: getProficiencyColor(skill.proficiency) + '20',
                                            paddingHorizontal: spacing.sm,
                                            paddingVertical: 2,
                                            borderRadius: borderRadius.sm,
                                        }}>
                                            <Text style={{
                                                fontSize: typography.fontSize.xs,
                                                color: getProficiencyColor(skill.proficiency),
                                                fontWeight: '500',
                                                textTransform: 'capitalize',
                                            }}>
                                                {skill.proficiency}
                                            </Text>
                                        </View>
                                        {skill.years_experience > 0 && (
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                                                {skill.years_experience} yrs exp
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Experience */}
                {candidate.experiences && candidate.experiences.length > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
                            Work Experience
                        </Text>
                        {candidate.experiences.map((exp, index) => (
                            <View
                                key={index}
                                style={{
                                    paddingBottom: spacing.md,
                                    marginBottom: spacing.md,
                                    borderBottomWidth: index < candidate.experiences.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                    {exp.job_title}
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.sm, color: colors.primary }}>
                                    {exp.company}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                        {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                                    </Text>
                                    {exp.location && (
                                        <>
                                            <Text style={{ color: colors.textMuted }}> • </Text>
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                                {exp.location}
                                            </Text>
                                        </>
                                    )}
                                </View>
                                {exp.description && (
                                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
                                        {exp.description}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Certifications */}
                {candidate.certifications && candidate.certifications.length > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
                            Certifications
                        </Text>
                        {candidate.certifications.map((cert, index) => (
                            <View
                                key={index}
                                style={{
                                    paddingVertical: spacing.sm,
                                    borderBottomWidth: index < candidate.certifications.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons
                                        name="ribbon"
                                        size={20}
                                        color={cert.is_expired ? colors.error : colors.success}
                                    />
                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                        <Text style={{ fontSize: typography.fontSize.base, color: colors.text }}>
                                            {cert.name}
                                        </Text>
                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                            {cert.organization}
                                        </Text>
                                        {cert.issue_date && (
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                                                Issued: {cert.issue_date}{cert.expiry_date ? ` • Expires: ${cert.expiry_date}` : ''}
                                            </Text>
                                        )}
                                    </View>
                                    {cert.is_expired && (
                                        <View style={{
                                            backgroundColor: colors.error + '20',
                                            paddingHorizontal: spacing.sm,
                                            paddingVertical: 2,
                                            borderRadius: borderRadius.sm,
                                        }}>
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.error }}>Expired</Text>
                                        </View>
                                    )}
                                </View>
                                {/* Action buttons for certificate */}
                                <View style={{ flexDirection: 'row', marginTop: spacing.sm, marginLeft: 28, gap: spacing.sm }}>
                                    {cert.document_url && (
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.primary + '20',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: 4,
                                                borderRadius: borderRadius.sm,
                                            }}
                                            onPress={() => Linking.openURL(cert.document_url!)}
                                        >
                                            <Ionicons name="document-outline" size={14} color={colors.primary} />
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary, marginLeft: 4 }}>
                                                View Certificate
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {cert.credential_url && (
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.success + '20',
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: 4,
                                                borderRadius: borderRadius.sm,
                                            }}
                                            onPress={() => Linking.openURL(cert.credential_url!)}
                                        >
                                            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.success, marginLeft: 4 }}>
                                                Verify
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Resumes */}
                {candidate.resumes && candidate.resumes.length > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
                            Resume
                        </Text>
                        {candidate.resumes.map((resume, index) => (
                            <TouchableOpacity
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: spacing.sm,
                                    borderBottomWidth: index < candidate.resumes.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.border,
                                }}
                                onPress={() => resume.file_url && Linking.openURL(resume.file_url)}
                                disabled={!resume.file_url}
                            >
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 8,
                                    backgroundColor: colors.primary + '20',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Ionicons
                                        name={resume.file_type === 'pdf' ? 'document' : 'document-text'}
                                        size={20}
                                        color={colors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: typography.fontSize.base, color: colors.text }}>
                                            {resume.title}
                                        </Text>
                                        {resume.is_primary && (
                                            <View style={{
                                                backgroundColor: colors.success + '20',
                                                paddingHorizontal: 6,
                                                paddingVertical: 2,
                                                borderRadius: borderRadius.sm,
                                                marginLeft: spacing.xs,
                                            }}>
                                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.success }}>Primary</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                                        {resume.file_type.toUpperCase()} • Uploaded {resume.uploaded_at}
                                    </Text>
                                </View>
                                {resume.file_url && (
                                    <Ionicons name="download-outline" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Portfolio */}
                {candidate.portfolio && candidate.portfolio.length > 0 && (
                    <View style={{
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
                            Portfolio
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                            {candidate.portfolio.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{
                                        width: '48%',
                                        backgroundColor: colors.background,
                                        borderRadius: borderRadius.base,
                                        overflow: 'hidden',
                                    }}
                                    onPress={() => item.project_url && Linking.openURL(item.project_url)}
                                >
                                    {item.media_url && (
                                        <Image
                                            source={{ uri: item.media_url }}
                                            style={{ width: '100%', height: 100 }}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={{ padding: spacing.sm }}>
                                        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        {item.description && (
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }} numberOfLines={2}>
                                                {item.description}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Member Since */}
                <View style={{
                    alignItems: 'center',
                    paddingVertical: spacing.lg,
                }}>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                        Member since {candidate.member_since}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
