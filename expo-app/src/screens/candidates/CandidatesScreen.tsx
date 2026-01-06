import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import candidateService, {
    Candidate,
    CandidateSearchFilters,
    SearchFiltersResponse,
} from '../../services/candidateService';

export default function CandidatesScreen() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { t } = useTranslation();

    // State
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filterOptions, setFilterOptions] = useState<SearchFiltersResponse | null>(null);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSkills, setSelectedSkills] = useState<{ id: number; name: string }[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showSkillPicker, setShowSkillPicker] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<CandidateSearchFilters>({
        sort_by: 'match_score',
        page: 1,
        page_size: 20,
    });

    // Load initial data
    useEffect(() => {
        loadFilterOptions();
    }, []);

    const loadFilterOptions = async () => {
        try {
            const options = await candidateService.getSearchFilters();
            setFilterOptions(options);
        } catch (error) {
            console.error('Error loading filter options:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchCandidates = useCallback(async (page: number = 1, append: boolean = false) => {
        if (selectedSkills.length === 0 && !searchQuery.trim()) {
            setCandidates([]);
            setTotalResults(0);
            return;
        }

        setSearching(true);
        try {
            const searchFilters: CandidateSearchFilters = {
                ...filters,
                skills: selectedSkills.map(s => s.id),
                skill_names: searchQuery.trim() ? searchQuery.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                page,
            };

            const result = await candidateService.searchCandidates(searchFilters);

            if (append) {
                setCandidates(prev => [...prev, ...result.candidates]);
            } else {
                setCandidates(result.candidates);
            }
            setTotalResults(result.total);
            setCurrentPage(result.page);
            setTotalPages(result.total_pages);
        } catch (error) {
            console.error('Error searching candidates:', error);
        } finally {
            setSearching(false);
            setRefreshing(false);
        }
    }, [filters, selectedSkills, searchQuery]);

    const handleSearch = () => {
        setCurrentPage(1);
        searchCandidates(1);
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages && !searching) {
            searchCandidates(currentPage + 1, true);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        searchCandidates(1);
    };

    const toggleSkill = (skill: { id: number; name: string }) => {
        setSelectedSkills(prev => {
            const exists = prev.find(s => s.id === skill.id);
            if (exists) {
                return prev.filter(s => s.id !== skill.id);
            } else {
                return [...prev, skill];
            }
        });
    };

    const removeSkill = (skillId: number) => {
        setSelectedSkills(prev => prev.filter(s => s.id !== skillId));
    };

    const applyFilters = (newFilters: Partial<CandidateSearchFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setShowFilters(false);
    };

    const viewCandidateDetail = (candidate: Candidate) => {
        navigation.navigate('CandidateDetail', { uuid: candidate.user_uuid, candidate });
    };

    const getAvailabilityColor = (status: string) => {
        switch (status) {
            case 'available': return colors.success;
            case 'busy': return colors.warning;
            default: return colors.textMuted;
        }
    };

    const getAvailabilityLabel = (status: string) => {
        switch (status) {
            case 'available': return 'Available';
            case 'busy': return 'Busy';
            default: return 'Not Available';
        }
    };

    const renderCandidateCard = ({ item: candidate }: { item: Candidate }) => (
        <TouchableOpacity
            style={{
                backgroundColor: colors.card,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
            }}
            onPress={() => viewCandidateDetail(candidate)}
            activeOpacity={0.7}
        >
            {/* Header */}
            <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                {/* Avatar */}
                <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.primaryLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                }}>
                    {candidate.avatar_url ? (
                        <Image
                            source={{ uri: candidate.avatar_url }}
                            style={{ width: 60, height: 60, borderRadius: 30 }}
                        />
                    ) : (
                        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                            {candidate.name.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            flex: 1,
                        }}>
                            {candidate.name}
                        </Text>
                        {candidate.is_verified && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        )}
                        {candidate.is_premium && (
                            <Ionicons name="diamond" size={16} color={colors.warning} style={{ marginLeft: 4 }} />
                        )}
                    </View>
                    {candidate.headline && (
                        <Text
                            style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}
                            numberOfLines={1}
                        >
                            {candidate.headline}
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {candidate.location.city && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
                                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginLeft: 2 }}>
                                    {candidate.location.city}
                                </Text>
                            </View>
                        )}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: getAvailabilityColor(candidate.availability) + '20',
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                            borderRadius: borderRadius.sm,
                        }}>
                            <View style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: getAvailabilityColor(candidate.availability),
                                marginRight: 4,
                            }} />
                            <Text style={{
                                fontSize: typography.fontSize.xs,
                                color: getAvailabilityColor(candidate.availability),
                                fontWeight: '500',
                            }}>
                                {getAvailabilityLabel(candidate.availability)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Match Score */}
                <View style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: candidate.match_score >= 70 ? colors.success + '20' :
                        candidate.match_score >= 40 ? colors.warning + '20' : colors.textMuted + '20',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.base,
                    minWidth: 60,
                }}>
                    <Text style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: '700',
                        color: candidate.match_score >= 70 ? colors.success :
                            candidate.match_score >= 40 ? colors.warning : colors.textMuted,
                    }}>
                        {candidate.match_score}%
                    </Text>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                        Match
                    </Text>
                </View>
            </View>

            {/* Skills */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                {candidate.skills.slice(0, 5).map((skill, index) => (
                    <View
                        key={index}
                        style={{
                            backgroundColor: skill.is_match ? colors.primary + '20' : colors.background,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 4,
                            borderRadius: borderRadius.sm,
                            borderWidth: skill.is_match ? 1 : 0,
                            borderColor: colors.primary,
                        }}
                    >
                        <Text style={{
                            fontSize: typography.fontSize.xs,
                            color: skill.is_match ? colors.primary : colors.textSecondary,
                            fontWeight: skill.is_match ? '600' : '400',
                        }}>
                            {skill.name}
                            {skill.is_primary && ' ★'}
                        </Text>
                    </View>
                ))}
                {candidate.skills.length > 5 && (
                    <View style={{
                        backgroundColor: colors.background,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        borderRadius: borderRadius.sm,
                    }}>
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                            +{candidate.skills.length - 5} more
                        </Text>
                    </View>
                )}
            </View>

            {/* Stats Row */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
            }}>
                {/* Rating */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={{ marginLeft: 4, fontSize: typography.fontSize.sm, color: colors.text, fontWeight: '600' }}>
                        {candidate.rating?.toFixed(1) || 'N/A'}
                    </Text>
                </View>

                {/* Jobs */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="briefcase-outline" size={16} color={colors.textMuted} />
                    <Text style={{ marginLeft: 4, fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                        {candidate.jobs_completed} jobs
                    </Text>
                </View>

                {/* Rate */}
                {(candidate.hourly_rate.min || candidate.hourly_rate.max) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.success, fontWeight: '600' }}>
                            {candidate.hourly_rate.currency}{' '}
                            {candidate.hourly_rate.min}-{candidate.hourly_rate.max}/hr
                        </Text>
                    </View>
                )}

                {/* Remote */}
                {candidate.remote_available && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="globe-outline" size={16} color={colors.primary} />
                        <Text style={{ marginLeft: 4, fontSize: typography.fontSize.xs, color: colors.primary }}>
                            Remote
                        </Text>
                    </View>
                )}
            </View>

            {/* Match Strengths */}
            {candidate.match_details.strengths.length > 0 && (
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.xs,
                    marginTop: spacing.sm,
                }}>
                    {candidate.match_details.strengths.slice(0, 3).map((strength, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.successLight,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 2,
                                borderRadius: borderRadius.sm,
                            }}
                        >
                            <Ionicons name="checkmark" size={12} color={colors.success} />
                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.success, marginLeft: 2 }}>
                                {strength}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                    fontSize: typography.fontSize.xl,
                    fontWeight: '700',
                    color: colors.text,
                    marginLeft: spacing.md,
                }}>
                    {t('candidates.title') || 'Find Candidates'}
                </Text>
                <TouchableOpacity
                    onPress={() => setShowFilters(true)}
                    style={{ padding: spacing.sm }}
                >
                    <Ionicons name="options-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ padding: spacing.base }}>
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    paddingHorizontal: spacing.md,
                    alignItems: 'center',
                }}>
                    <Ionicons name="search" size={20} color={colors.textMuted} />
                    <TextInput
                        style={{
                            flex: 1,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.sm,
                            fontSize: typography.fontSize.base,
                            color: colors.text,
                        }}
                        placeholder="Search by skills (e.g., Python, React)..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity
                        onPress={handleSearch}
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: borderRadius.base,
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text>
                    </TouchableOpacity>
                </View>

                {/* Selected Skills */}
                {selectedSkills.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                        {selectedSkills.map(skill => (
                            <TouchableOpacity
                                key={skill.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.primary + '20',
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: 4,
                                    borderRadius: borderRadius.full,
                                }}
                                onPress={() => removeSkill(skill.id)}
                            >
                                <Text style={{ color: colors.primary, fontSize: typography.fontSize.sm }}>
                                    {skill.name}
                                </Text>
                                <Ionicons name="close" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Quick Skill Suggestions */}
                {filterOptions && selectedSkills.length === 0 && (
                    <View style={{ marginTop: spacing.md }}>
                        <Text style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: '600',
                            color: colors.textSecondary,
                            marginBottom: spacing.sm,
                        }}>
                            Popular Skills
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                            {filterOptions.popular_skills.slice(0, 10).map(skill => (
                                <TouchableOpacity
                                    key={skill.id}
                                    style={{
                                        backgroundColor: colors.card,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.full,
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder,
                                    }}
                                    onPress={() => toggleSkill(skill)}
                                >
                                    <Text style={{ color: colors.text, fontSize: typography.fontSize.sm }}>
                                        {skill.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Results */}
            {candidates.length > 0 ? (
                <FlatList
                    data={candidates}
                    renderItem={renderCandidateCard}
                    keyExtractor={item => item.user_uuid}
                    contentContainerStyle={{ padding: spacing.base, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListHeaderComponent={
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                                {totalResults} candidates found
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowFilters(true)}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="funnel-outline" size={14} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: typography.fontSize.sm, marginLeft: 4 }}>
                                    Sort: {filters.sort_by?.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                    ListFooterComponent={
                        searching ? (
                            <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
                        ) : null
                    }
                />
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                    <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                    <Text style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: '600',
                        color: colors.text,
                        marginTop: spacing.md,
                        textAlign: 'center',
                    }}>
                        {t('candidates.searchPrompt') || 'Search for Candidates'}
                    </Text>
                    <Text style={{
                        fontSize: typography.fontSize.base,
                        color: colors.textSecondary,
                        marginTop: spacing.sm,
                        textAlign: 'center',
                    }}>
                        {t('candidates.searchHint') || 'Enter skills or select from popular skills above to find matching candidates'}
                    </Text>
                </View>
            )}

            {/* Filters Modal */}
            <Modal
                visible={showFilters}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: borderRadius.xl,
                        borderTopRightRadius: borderRadius.xl,
                        padding: spacing.lg,
                        maxHeight: '80%',
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                Filters & Sort
                            </Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Sort By */}
                            <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                                Sort By
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                                {filterOptions?.sort_options.map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={{
                                            backgroundColor: filters.sort_by === option.value ? colors.primary : colors.card,
                                            paddingHorizontal: spacing.md,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.full,
                                            borderWidth: 1,
                                            borderColor: filters.sort_by === option.value ? colors.primary : colors.cardBorder,
                                        }}
                                        onPress={() => applyFilters({ sort_by: option.value as any })}
                                    >
                                        <Text style={{
                                            color: filters.sort_by === option.value ? '#fff' : colors.text,
                                            fontSize: typography.fontSize.sm,
                                        }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Availability */}
                            <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                                Availability
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: !filters.availability ? colors.primary : colors.card,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.full,
                                        borderWidth: 1,
                                        borderColor: !filters.availability ? colors.primary : colors.cardBorder,
                                    }}
                                    onPress={() => applyFilters({ availability: undefined })}
                                >
                                    <Text style={{ color: !filters.availability ? '#fff' : colors.text, fontSize: typography.fontSize.sm }}>
                                        Any
                                    </Text>
                                </TouchableOpacity>
                                {filterOptions?.availability_options.map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={{
                                            backgroundColor: filters.availability === option.value ? colors.primary : colors.card,
                                            paddingHorizontal: spacing.md,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.full,
                                            borderWidth: 1,
                                            borderColor: filters.availability === option.value ? colors.primary : colors.cardBorder,
                                        }}
                                        onPress={() => applyFilters({ availability: option.value as any })}
                                    >
                                        <Text style={{
                                            color: filters.availability === option.value ? '#fff' : colors.text,
                                            fontSize: typography.fontSize.sm,
                                        }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Minimum Proficiency */}
                            <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                                Minimum Skill Level
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: !filters.min_proficiency ? colors.primary : colors.card,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.full,
                                        borderWidth: 1,
                                        borderColor: !filters.min_proficiency ? colors.primary : colors.cardBorder,
                                    }}
                                    onPress={() => applyFilters({ min_proficiency: undefined })}
                                >
                                    <Text style={{ color: !filters.min_proficiency ? '#fff' : colors.text, fontSize: typography.fontSize.sm }}>
                                        Any
                                    </Text>
                                </TouchableOpacity>
                                {filterOptions?.proficiency_levels.map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={{
                                            backgroundColor: filters.min_proficiency === option.value ? colors.primary : colors.card,
                                            paddingHorizontal: spacing.md,
                                            paddingVertical: spacing.sm,
                                            borderRadius: borderRadius.full,
                                            borderWidth: 1,
                                            borderColor: filters.min_proficiency === option.value ? colors.primary : colors.cardBorder,
                                        }}
                                        onPress={() => applyFilters({ min_proficiency: option.value as any })}
                                    >
                                        <Text style={{
                                            color: filters.min_proficiency === option.value ? '#fff' : colors.text,
                                            fontSize: typography.fontSize.sm,
                                        }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Quick Toggles */}
                            <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    onPress={() => applyFilters({ verified_only: !filters.verified_only })}
                                >
                                    <Text style={{ color: colors.text, fontSize: typography.fontSize.base }}>Verified Only</Text>
                                    <Ionicons
                                        name={filters.verified_only ? 'checkbox' : 'square-outline'}
                                        size={24}
                                        color={filters.verified_only ? colors.primary : colors.textMuted}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    onPress={() => applyFilters({ remote_ok: !filters.remote_ok })}
                                >
                                    <Text style={{ color: colors.text, fontSize: typography.fontSize.base }}>Remote Available</Text>
                                    <Ionicons
                                        name={filters.remote_ok ? 'checkbox' : 'square-outline'}
                                        size={24}
                                        color={filters.remote_ok ? colors.primary : colors.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Apply Button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: spacing.md,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center',
                                    marginTop: spacing.md,
                                }}
                                onPress={() => {
                                    setShowFilters(false);
                                    handleSearch();
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                    Apply Filters
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
