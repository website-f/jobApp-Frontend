import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore, useColors } from '../../store';
import skillService, { Skill, SeekerSkill, SeekerCertification } from '../../services/skillService';
import * as DocumentPicker from 'expo-document-picker';

export default function SkillsScreen() {
    const navigation = useNavigation();
    const { skills, setSkills } = useProfileStore();
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Skill[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mySkills, setMySkills] = useState<SeekerSkill[]>([]);
    const [myCerts, setMyCerts] = useState<SeekerCertification[]>([]);
    const [expandedSkillId, setExpandedSkillId] = useState<number | null>(null);
    const colors = useColors();

    // Cert Modal State
    const [showCertModal, setShowCertModal] = useState(false);
    const [certForm, setCertForm] = useState({
        name: '',
        organization: '',
        issue_date: new Date().toISOString().split('T')[0],
        credential_id: '',
        credential_url: '',
        document: null as any,
    });
    const [activeSkillForCert, setActiveSkillForCert] = useState<SeekerSkill | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [skillsData, certsData] = await Promise.all([
                skillService.getMySkills(),
                skillService.getMyCertifications(),
            ]);
            setMySkills(skillsData || []);
            setSkills(skillsData || []);
            setMyCerts(certsData || []);
        } catch (error: any) {
            console.error('Failed to load data:', error);
            Alert.alert('Error', 'Failed to load skills and certifications.');
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
            const newSkills = [...mySkills, response];
            setMySkills(newSkills);
            setSkills(newSkills);
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

    // Certification Logic
    const openAddCertModal = (skill: SeekerSkill) => {
        setActiveSkillForCert(skill);
        setCertForm({
            name: `${skill.skill_name} Certified`, // Pre-fill with skill name
            organization: '',
            issue_date: new Date().toISOString().split('T')[0],
            credential_id: '',
            credential_url: '',
            document: null,
        });
        setShowCertModal(true);
    };

    const handleAddCert = async () => {
        if (!certForm.name || !certForm.organization || !certForm.issue_date) {
            Alert.alert('Missing Fields', 'Please fill Name, Organization, and Issue Date');
            return;
        }

        try {
            // 1. Create Certification
            const newCert = await skillService.addCertification({
                custom_name: certForm.name,
                custom_organization: certForm.organization,
                issue_date: certForm.issue_date,
                credential_id: certForm.credential_id,
                credential_url: certForm.credential_url,
            });

            // 2. Upload Document if selected
            let finalCert = newCert;
            if (certForm.document) {
                const formData = new FormData();
                formData.append('document', {
                    uri: certForm.document.uri,
                    name: certForm.document.name,
                    type: certForm.document.mimeType || 'application/pdf',
                } as any);

                try {
                    await skillService.uploadCertificationDocument(newCert.id, formData);
                    // Refresh to get the updated URL
                    const updatedCerts = await skillService.getMyCertifications();
                    const updated = updatedCerts.find(c => c.id === newCert.id);
                    if (updated) finalCert = updated;
                } catch (uploadError) {
                    console.error('Cert upload failed:', uploadError);
                    Alert.alert('Warning', 'Certification created but file upload failed.');
                }
            }

            setMyCerts([...myCerts, finalCert]);
            setShowCertModal(false);
            Alert.alert('Success', 'Certification added!');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to add certification');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCertForm({ ...certForm, document: result.assets[0] });
            }
        } catch (err) {
            console.log('Document picker error:', err);
        }
    };

    const removeCert = async (certId: number) => {
        Alert.alert('Remove Certification', 'Irreversible action. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await skillService.removeCertification(certId);
                        setMyCerts(myCerts.filter(c => c.id !== certId));
                    } catch (error) {
                        Alert.alert('Error', 'Failed to remove certification');
                    }
                }
            }
        ]);
    };

    // Helper to find certs related to a skill
    const getRelatedCerts = (skill: SeekerSkill) => {
        const query = skill.skill_name.toLowerCase();
        return myCerts.filter(cert => {
            const certName = (cert.name || cert.custom_name || '').toLowerCase();
            const certOrg = (cert.organization || cert.custom_organization || '').toLowerCase();
            return certName.includes(query) || certOrg.includes(query);
        });
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>My Skills & Certs</Text>
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
                        placeholder="Search skills (e.g. React, Python)..."
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

                {/* My Skills List */}
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
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : mySkills.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: 20 }}>No skills added yet.</Text>
                    ) : (
                        <View>
                            {mySkills.map((skill) => {
                                const isExpanded = expandedSkillId === skill.id;
                                const relatedCerts = getRelatedCerts(skill);

                                return (
                                    <View
                                        key={skill.id}
                                        style={{
                                            backgroundColor: colors.inputBackground,
                                            borderRadius: 12,
                                            marginBottom: 10,
                                            overflow: 'hidden',
                                            borderWidth: 1,
                                            borderColor: isExpanded ? colors.primary : 'transparent',
                                        }}
                                    >
                                        {/* Main Skill Row */}
                                        <TouchableOpacity
                                            style={{ padding: 14 }}
                                            onPress={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{skill.skill_name}</Text>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{relatedCerts.length} certification{relatedCerts.length !== 1 ? 's' : ''}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: levelColors[skill.proficiency_level] + '20' }}>
                                                        <Text style={{ fontSize: 10, color: levelColors[skill.proficiency_level], textTransform: 'uppercase', fontWeight: '700' }}>
                                                            {skill.proficiency_level}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>{isExpanded ? '▲' : '▼'}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0 }}>
                                                {/* Proficiency Selector */}
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Proficiency</Text>
                                                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
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
                                                                {level.slice(0, 3)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>

                                                {/* Certifications Section */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Certifications</Text>
                                                    <TouchableOpacity onPress={() => openAddCertModal(skill)}>
                                                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>+ Add Cert</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {relatedCerts.length > 0 ? (
                                                    <View style={{ gap: 8 }}>
                                                        {relatedCerts.map(cert => (
                                                            <View key={cert.id} style={{
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: colors.background,
                                                                padding: 10,
                                                                borderRadius: 8,
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: colors.success
                                                            }}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{cert.name || cert.custom_name}</Text>
                                                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{cert.organization || cert.custom_organization}</Text>
                                                                </View>
                                                                <TouchableOpacity onPress={() => removeCert(cert.id)}>
                                                                    <Text style={{ fontSize: 16, color: colors.error }}>×</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : (
                                                    <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 }}>
                                                        No certifications linked to {skill.skill_name}.
                                                    </Text>
                                                )}

                                                {/* Remove Skill Button */}
                                                <TouchableOpacity
                                                    style={{ marginTop: 16, alignItems: 'center' }}
                                                    onPress={() => removeSkill(skill.id)}
                                                >
                                                    <Text style={{ fontSize: 12, color: colors.error }}>Remove Skill</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add/Edit Cert Modal */}
            <Modal visible={showCertModal} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '80%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Add Certification</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
                            For skill: <Text style={{ fontWeight: '600' }}>{activeSkillForCert?.skill_name}</Text>
                        </Text>

                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Certification Name *</Text>
                        <TextInput
                            style={{ backgroundColor: colors.inputBackground, borderRadius: 8, padding: 12, marginBottom: 12, color: colors.text }}
                            value={certForm.name}
                            onChangeText={(t) => setCertForm({ ...certForm, name: t })}
                            placeholder="e.g. Certified Developer"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Issuing Organization *</Text>
                        <TextInput
                            style={{ backgroundColor: colors.inputBackground, borderRadius: 8, padding: 12, marginBottom: 12, color: colors.text }}
                            value={certForm.organization}
                            onChangeText={(t) => setCertForm({ ...certForm, organization: t })}
                            placeholder="e.g. AWS, Microsoft, Google"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Issue Date (YYYY-MM-DD) *</Text>
                        <TextInput
                            style={{ backgroundColor: colors.inputBackground, borderRadius: 8, padding: 12, marginBottom: 20, color: colors.text }}
                            value={certForm.issue_date}
                            onChangeText={(t) => setCertForm({ ...certForm, issue_date: t })}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Certificate File (Optional)</Text>
                        <TouchableOpacity
                            onPress={pickDocument}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.inputBackground,
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 20,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderStyle: 'dashed'
                            }}
                        >
                            <Text style={{ fontSize: 20, marginRight: 10 }}>📄</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, color: colors.text }}>
                                    {certForm.document ? certForm.document.name : 'Select PDF or Image'}
                                </Text>
                            </View>
                            {certForm.document && (
                                <TouchableOpacity onPress={() => setCertForm({ ...certForm, document: null })}>
                                    <Text style={{ color: colors.error, fontWeight: '600' }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.inputBackground }}
                                onPress={() => setShowCertModal(false)}
                            >
                                <Text style={{ color: colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary }}
                                onPress={handleAddCert}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600' }}>Save Cert</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
