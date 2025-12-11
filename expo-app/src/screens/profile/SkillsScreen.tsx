import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore, useColors } from '../../store';
import skillService, { Skill, SeekerSkill } from '../../services/skillService';

export default function SkillsScreen() {
    const navigation = useNavigation();
    const { skills, setSkills } = useProfileStore();
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Skill[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mySkills, setMySkills] = useState<SeekerSkill[]>([]);
    const colors = useColors();

    useEffect(() => {
        loadSkills();
    }, []);

    const loadSkills = async () => {
        setIsLoading(true);
        try {
            const response = await skillService.getMySkills();
            // Response is an array directly, not { success, data }
            setMySkills(response || []);
            setSkills(response || []);
        } catch (error: any) {
            console.error('Failed to load skills:', error);
            Alert.alert('Error', 'Failed to load skills. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const searchSkills = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await skillService.searchSkills(query);
            // Filter out skills already added
            const existingIds = mySkills.map((s) => s.skill);
            setSearchResults((response || []).filter((s) => !existingIds.includes(s.id)));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        searchSkills(query);
    };

    const addSkill = async (skill: Skill) => {
        try {
            const response = await skillService.addSkill({
                skill: skill.id,
                proficiency_level: 'intermediate',
                is_primary: mySkills.length === 0,
            });
            setMySkills([...mySkills, response]);
            setSkills([...mySkills, response]);
            setSearchQuery('');
            setSearchResults([]);
            Alert.alert('Success', `${skill.name} added to your skills`);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to add skill');
        }
    };

    const removeSkill = async (skillId: number) => {
        Alert.alert('Remove Skill', 'Are you sure you want to remove this skill?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await skillService.removeSkill(skillId);
                        const updated = mySkills.filter((s) => s.id !== skillId);
                        setMySkills(updated);
                        setSkills(updated);
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.detail || 'Failed to remove skill');
                    }
                },
            },
        ]);
    };

    const updateSkillLevel = async (skillId: number, level: string) => {
        try {
            await skillService.updateSkill(skillId, { proficiency_level: level as any });
            const updated = mySkills.map((s) => (s.id === skillId ? { ...s, proficiency_level: level as any } : s));
            setMySkills(updated);
            setSkills(updated);
        } catch (error) {
            console.error('Failed to update skill:', error);
        }
    };

    const proficiencyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const levelColors: Record<string, string> = {
        beginner: '#3B82F6',
        intermediate: '#22C55E',
        advanced: '#F59E0B',
        expert: '#EF4444',
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>My Skills</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Search Section */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Add New Skill</Text>
                    <TextInput
                        style={{
                            backgroundColor: colors.inputBackground,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            fontSize: 14,
                            color: colors.text,
                        }}
                        placeholder="Search skills..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />

                    {isSearching && (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                    )}

                    {searchResults.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            {searchResults.slice(0, 5).map((skill) => (
                                <TouchableOpacity
                                    key={skill.id}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        paddingHorizontal: 12,
                                        backgroundColor: colors.inputBackground,
                                        borderRadius: 10,
                                        marginBottom: 8,
                                    }}
                                    onPress={() => addSkill(skill)}
                                >
                                    <View>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{skill.name}</Text>
                                        {skill.category_name && (
                                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{skill.category_name}</Text>
                                        )}
                                    </View>
                                    <View style={{
                                        backgroundColor: colors.primary,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 16,
                                    }}>
                                        <Text style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>+ Add</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* My Skills */}
                <View style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
                        My Skills ({mySkills.length})
                    </Text>

                    {isLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : mySkills.length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No skills yet</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                                Search and add your skills to match with jobs
                            </Text>
                        </View>
                    ) : (
                        <View>
                            {mySkills.map((skill) => (
                                <View
                                    key={skill.id}
                                    style={{
                                        backgroundColor: colors.inputBackground,
                                        borderRadius: 12,
                                        padding: 14,
                                        marginBottom: 10,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{skill.skill_name}</Text>
                                            {skill.category_name && (
                                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{skill.category_name}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity onPress={() => removeSkill(skill.id)}>
                                            <Text style={{ fontSize: 18, color: colors.error }}>×</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Proficiency Level */}
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                                        {proficiencyLevels.map((level) => (
                                            <TouchableOpacity
                                                key={level}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 6,
                                                    borderRadius: 8,
                                                    backgroundColor: skill.proficiency_level === level ? levelColors[level] : colors.background,
                                                    borderWidth: 1,
                                                    borderColor: skill.proficiency_level === level ? levelColors[level] : colors.border,
                                                    alignItems: 'center',
                                                }}
                                                onPress={() => updateSkillLevel(skill.id, level)}
                                            >
                                                <Text style={{
                                                    fontSize: 10,
                                                    fontWeight: '600',
                                                    color: skill.proficiency_level === level ? '#FFF' : colors.textSecondary,
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {level}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Extra Info */}
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                        {skill.is_primary && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{ fontSize: 11, color: colors.warning }}>⭐ Primary</Text>
                                            </View>
                                        )}
                                        {skill.endorsement_count > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>👍 {skill.endorsement_count} endorsements</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
