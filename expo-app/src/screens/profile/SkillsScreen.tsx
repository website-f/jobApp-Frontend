import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    StyleSheet,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfileStore, useColors, spacing, typography, borderRadius } from '../../store';
import skillService, { Skill, SeekerSkill, SeekerCertification } from '../../services/skillService';
import * as DocumentPicker from 'expo-document-picker';
import { processFileForUpload, formatFileSize, isImageFile } from '../../utils';
import {
    Card,
    Button,
    Input,
    Badge,
    LoadingSpinner,
    EmptyState,
    SectionHeader,
} from '../../components/ui';

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
        expiry_date: '',
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

    const addCustomSkill = async (skillName: string) => {
        try {
            // First create the custom skill in the catalog
            const customSkill = await skillService.createCustomSkill(skillName);

            // Then add it to the user's profile
            const response = await skillService.addSkill({
                skill: customSkill.id,
                proficiency_level: 'intermediate',
                is_primary: mySkills.length === 0,
            });

            const newSkills = [...mySkills, response];
            setMySkills(newSkills);
            setSkills(newSkills);
            setSearchQuery('');
            setSearchResults([]);
            Alert.alert('Success', `"${skillName}" added as a custom skill`);
        } catch (error: any) {
            console.error('Failed to add custom skill:', error);
            Alert.alert('Error', error.response?.data?.error || error.response?.data?.detail || 'Failed to add custom skill');
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
            name: `${skill.skill_name} Certified`,
            organization: '',
            issue_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
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
            const newCert = await skillService.addCertification({
                custom_name: certForm.name,
                custom_organization: certForm.organization,
                issue_date: certForm.issue_date,
                expiry_date: certForm.expiry_date || undefined,
                credential_id: certForm.credential_id,
                credential_url: certForm.credential_url,
            });

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
                const asset = result.assets[0];
                const mimeType = asset.mimeType || 'application/octet-stream';

                // If it's an image, compress it
                if (isImageFile(mimeType)) {
                    try {
                        const compressed = await processFileForUpload(
                            asset.uri,
                            mimeType,
                            asset.name
                        );
                        setCertForm({
                            ...certForm,
                            document: {
                                uri: compressed.uri,
                                name: compressed.name,
                                mimeType: compressed.type,
                                size: compressed.size,
                                originalSize: compressed.originalSize,
                            }
                        });

                        // Show compression result
                        if (compressed.compressionRatio < 1) {
                            const savedPercent = Math.round((1 - compressed.compressionRatio) * 100);
                            console.log(`Image compressed: ${formatFileSize(compressed.originalSize)} -> ${formatFileSize(compressed.size)} (${savedPercent}% saved)`);
                        }
                    } catch (compressError) {
                        console.error('Compression failed, using original:', compressError);
                        setCertForm({ ...certForm, document: asset });
                    }
                } else {
                    // PDF or other - use as-is
                    setCertForm({ ...certForm, document: asset });
                }
            }
        } catch (err) {
            console.log('Document picker error:', err);
        }
    };

    const removeCert = async (certId: number) => {
        Alert.alert('Remove Certification', 'This action cannot be undone. Continue?', [
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

    const getRelatedCerts = (skill: SeekerSkill) => {
        const query = skill.skill_name.toLowerCase();
        return myCerts.filter(cert => {
            const certName = (cert.name || cert.custom_name || '').toLowerCase();
            const certOrg = (cert.organization || cert.custom_organization || '').toLowerCase();
            return certName.includes(query) || certOrg.includes(query);
        });
    };

    const proficiencyLevels = [
        { value: 'beginner', label: 'Beg', color: '#3B82F6' },
        { value: 'intermediate', label: 'Int', color: '#22C55E' },
        { value: 'advanced', label: 'Adv', color: '#F59E0B' },
        { value: 'expert', label: 'Exp', color: '#EF4444' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Skills & Certs</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                        {mySkills.length} skills
                    </Text>
                </View>
                <View style={styles.backButton} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Add Skill Card */}
                <View style={styles.section}>
                    <Card variant="elevated">
                        <View style={styles.addSkillHeader}>
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.addSkillIcon}
                            >
                                <Ionicons name="add" size={24} color="#fff" />
                            </LinearGradient>
                            <View style={styles.addSkillText}>
                                <Text style={[styles.addSkillTitle, { color: colors.text }]}>Add New Skill</Text>
                                <Text style={[styles.addSkillSubtitle, { color: colors.textMuted }]}>
                                    Search from our catalog
                                </Text>
                            </View>
                        </View>

                        <View style={styles.searchContainer}>
                            <Input
                                placeholder="Search skills (e.g. React, Python)..."
                                value={searchQuery}
                                onChangeText={handleSearch}
                                leftIcon={<Ionicons name="search" size={18} color={colors.textMuted} />}
                                rightIcon={
                                    searchQuery ? (
                                        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    ) : undefined
                                }
                            />
                        </View>

                        {isSearching && (
                            <View style={styles.loadingContainer}>
                                <LoadingSpinner size="sm" />
                            </View>
                        )}

                        {searchResults.length > 0 && (
                            <View style={styles.searchResults}>
                                {searchResults.slice(0, 5).map((skill) => (
                                    <TouchableOpacity
                                        key={skill.id}
                                        style={[styles.searchResultItem, { backgroundColor: colors.surfaceHover }]}
                                        onPress={() => addSkill(skill)}
                                    >
                                        <View style={styles.searchResultContent}>
                                            <Text style={[styles.searchResultName, { color: colors.text }]}>
                                                {skill.name}
                                            </Text>
                                            {skill.category_name && (
                                                <Text style={[styles.searchResultCategory, { color: colors.textMuted }]}>
                                                    {skill.category_name}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
                                            <Ionicons name="add" size={18} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Option to add custom skill when no results */}
                        {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                            <TouchableOpacity
                                style={[styles.searchResultItem, { backgroundColor: colors.primaryLight, marginTop: spacing.sm }]}
                                onPress={() => addCustomSkill(searchQuery)}
                            >
                                <View style={styles.searchResultContent}>
                                    <Text style={[styles.searchResultName, { color: colors.primary }]}>
                                        Add "{searchQuery}" as custom skill
                                    </Text>
                                    <Text style={[styles.searchResultCategory, { color: colors.textMuted }]}>
                                        Not in catalog? Add it anyway!
                                    </Text>
                                </View>
                                <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="add" size={18} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        )}
                    </Card>
                </View>

                {/* My Skills */}
                <View style={styles.section}>
                    <SectionHeader
                        title="My Skills"
                        icon="code-slash"
                        subtitle={`${mySkills.length} skills added`}
                    />

                    {isLoading ? (
                        <Card variant="default" style={styles.loadingCard}>
                            <LoadingSpinner size="lg" />
                        </Card>
                    ) : mySkills.length === 0 ? (
                        <Card variant="default">
                            <EmptyState
                                icon="code-slash-outline"
                                title="No skills yet"
                                description="Add skills to showcase your expertise to employers"
                            />
                        </Card>
                    ) : (
                        <View style={styles.skillsList}>
                            {mySkills.map((skill) => {
                                const isExpanded = expandedSkillId === skill.id;
                                const relatedCerts = getRelatedCerts(skill);

                                return (
                                    <Card
                                        key={skill.id}
                                        variant={isExpanded ? 'outlined' : 'default'}
                                        style={[
                                            styles.skillCard,
                                            isExpanded && { borderColor: colors.primary }
                                        ]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.skillHeader}>
                                                <View style={styles.skillInfo}>
                                                    <Text style={[styles.skillName, { color: colors.text }]}>
                                                        {skill.skill_name}
                                                    </Text>
                                                    <View style={styles.skillMeta}>
                                                        <Badge
                                                            variant={skill.proficiency_level === 'expert' ? 'error' :
                                                                skill.proficiency_level === 'advanced' ? 'warning' :
                                                                    skill.proficiency_level === 'intermediate' ? 'success' : 'info'}
                                                            size="sm"
                                                        >
                                                            {skill.proficiency_level}
                                                        </Badge>
                                                        {relatedCerts.length > 0 && (
                                                            <Badge variant="verified" size="sm">
                                                                {relatedCerts.length} cert{relatedCerts.length > 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </View>
                                                </View>
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color={colors.textMuted}
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={styles.skillExpanded}>
                                                {/* Proficiency Selector */}
                                                <Text style={[styles.expandedLabel, { color: colors.textMuted }]}>
                                                    Proficiency Level
                                                </Text>
                                                <View style={styles.proficiencyGrid}>
                                                    {proficiencyLevels.map((level) => (
                                                        <TouchableOpacity
                                                            key={level.value}
                                                            style={[
                                                                styles.proficiencyOption,
                                                                {
                                                                    backgroundColor: skill.proficiency_level === level.value
                                                                        ? level.color
                                                                        : colors.surfaceHover,
                                                                    borderColor: skill.proficiency_level === level.value
                                                                        ? level.color
                                                                        : colors.border,
                                                                },
                                                            ]}
                                                            onPress={() => updateSkillLevel(skill.id, level.value)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.proficiencyLabel,
                                                                    {
                                                                        color: skill.proficiency_level === level.value
                                                                            ? '#fff'
                                                                            : colors.textMuted,
                                                                    },
                                                                ]}
                                                            >
                                                                {level.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>

                                                {/* Certifications */}
                                                <View style={styles.certsSection}>
                                                    <View style={styles.certsSectionHeader}>
                                                        <Text style={[styles.expandedLabel, { color: colors.textMuted }]}>
                                                            Certifications
                                                        </Text>
                                                        <TouchableOpacity onPress={() => openAddCertModal(skill)}>
                                                            <Text style={[styles.addCertLink, { color: colors.primary }]}>
                                                                + Add Cert
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {relatedCerts.length > 0 ? (
                                                        <View style={styles.certsList}>
                                                            {relatedCerts.map(cert => (
                                                                <View
                                                                    key={cert.id}
                                                                    style={[styles.certItem, { backgroundColor: colors.surfaceHover, borderLeftColor: colors.success }]}
                                                                >
                                                                    <View style={styles.certInfo}>
                                                                        <Text style={[styles.certName, { color: colors.text }]}>
                                                                            {cert.name || cert.custom_name}
                                                                        </Text>
                                                                        <Text style={[styles.certOrg, { color: colors.textMuted }]}>
                                                                            {cert.organization || cert.custom_organization}
                                                                        </Text>
                                                                    </View>
                                                                    <TouchableOpacity onPress={() => removeCert(cert.id)}>
                                                                        <Ionicons name="close" size={18} color={colors.error} />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ) : (
                                                        <Text style={[styles.noCerts, { color: colors.textMuted }]}>
                                                            No certifications for {skill.skill_name}
                                                        </Text>
                                                    )}
                                                </View>

                                                {/* Remove Button */}
                                                <TouchableOpacity
                                                    style={styles.removeSkillButton}
                                                    onPress={() => removeSkill(skill.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                                                    <Text style={[styles.removeSkillText, { color: colors.error }]}>
                                                        Remove Skill
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </Card>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Certification Modal */}
            <Modal visible={showCertModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.certModalContent, { backgroundColor: colors.background }]}>
                        {/* Modal Header */}
                        <View style={[styles.certModalHeader, { borderBottomColor: colors.border }]}>
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.certModalIcon}
                            >
                                <Ionicons name="ribbon" size={24} color="#fff" />
                            </LinearGradient>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                <Text style={[styles.certModalTitle, { color: colors.text }]}>Add Certification</Text>
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                    For: {activeSkillForCert?.skill_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowCertModal(false)}
                                style={[styles.certModalClose, { backgroundColor: colors.surfaceHover }]}
                            >
                                <Ionicons name="close" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>
                            {/* Certification Name */}
                            <View style={styles.certInputGroup}>
                                <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                    Certification Name <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <View style={[styles.certInputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={certForm.name}
                                        onChangeText={(t) => setCertForm({ ...certForm, name: t })}
                                        placeholder="e.g. AWS Solutions Architect"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.certTextInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* Issuing Organization */}
                            <View style={styles.certInputGroup}>
                                <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                    Issuing Organization <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <View style={[styles.certInputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="business-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={certForm.organization}
                                        onChangeText={(t) => setCertForm({ ...certForm, organization: t })}
                                        placeholder="e.g. Amazon Web Services"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.certTextInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* Date Row */}
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <View style={[styles.certInputGroup, { flex: 1 }]}>
                                    <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                        Issue Date <Text style={{ color: colors.error }}>*</Text>
                                    </Text>
                                    <View style={[styles.certInputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                                        <TextInput
                                            value={certForm.issue_date}
                                            onChangeText={(t) => setCertForm({ ...certForm, issue_date: t })}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.certTextInput, { color: colors.text, fontSize: 13 }]}
                                        />
                                    </View>
                                </View>

                                <View style={[styles.certInputGroup, { flex: 1 }]}>
                                    <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                        Expiry Date
                                    </Text>
                                    <View style={[styles.certInputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                                        <TextInput
                                            value={certForm.expiry_date}
                                            onChangeText={(t) => setCertForm({ ...certForm, expiry_date: t })}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.certTextInput, { color: colors.text, fontSize: 13 }]}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Credential ID */}
                            <View style={styles.certInputGroup}>
                                <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                    Credential ID
                                </Text>
                                <View style={[styles.certInputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="key-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={certForm.credential_id}
                                        onChangeText={(t) => setCertForm({ ...certForm, credential_id: t })}
                                        placeholder="e.g. ABC123XYZ"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.certTextInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* Certificate Document */}
                            <View style={[styles.certInputGroup, { marginBottom: spacing.xl }]}>
                                <Text style={[styles.certInputLabel, { color: colors.text }]}>
                                    Certificate Document
                                </Text>
                                <TouchableOpacity
                                    onPress={pickDocument}
                                    style={[styles.certDocPicker, {
                                        backgroundColor: certForm.document ? colors.successLight : colors.inputBackground,
                                        borderColor: certForm.document ? colors.success : colors.inputBorder
                                    }]}
                                >
                                    <View style={[styles.certDocIcon, { backgroundColor: certForm.document ? colors.success : colors.primary }]}>
                                        <Ionicons
                                            name={certForm.document ? "checkmark" : "cloud-upload-outline"}
                                            size={20}
                                            color="#fff"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.certDocText, { color: colors.text }]}>
                                            {certForm.document ? certForm.document.name : 'Upload PDF or Image'}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                            {certForm.document ? 'Tap to change file' : 'Max 10MB'}
                                        </Text>
                                    </View>
                                    {certForm.document && (
                                        <TouchableOpacity onPress={() => setCertForm({ ...certForm, document: null })}>
                                            <Ionicons name="close-circle" size={24} color={colors.error} />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Modal Actions */}
                        <View style={[styles.certModalActions, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                            <TouchableOpacity
                                onPress={() => setShowCertModal(false)}
                                style={[styles.certCancelBtn, { borderColor: colors.border }]}
                            >
                                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddCert} style={{ flex: 2 }}>
                                <LinearGradient
                                    colors={[colors.gradientStart, colors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.certSaveBtn}
                                >
                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Save</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    addSkillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    addSkillIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    addSkillText: {
        flex: 1,
    },
    addSkillTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    addSkillSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    searchContainer: {
        marginBottom: spacing.sm,
    },
    loadingContainer: {
        padding: spacing.md,
        alignItems: 'center',
    },
    searchResults: {
        gap: spacing.xs,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    searchResultContent: {
        flex: 1,
    },
    searchResultName: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    searchResultCategory: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCard: {
        paddingVertical: spacing.xxl,
    },
    skillsList: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    skillCard: {
        marginBottom: 0,
    },
    skillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    skillInfo: {
        flex: 1,
    },
    skillName: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    skillMeta: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    skillExpanded: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    expandedLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    proficiencyGrid: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    proficiencyOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
    },
    proficiencyLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold as any,
    },
    certsSection: {
        marginBottom: spacing.md,
    },
    certsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    addCertLink: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    certsList: {
        gap: spacing.xs,
    },
    certItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
    },
    certInfo: {
        flex: 1,
    },
    certName: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    certOrg: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    noCerts: {
        fontSize: typography.fontSize.sm,
        fontStyle: 'italic',
    },
    removeSkillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
    },
    removeSkillText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        paddingTop: spacing.lg,
        maxHeight: '90%',
    },
    modalHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        marginBottom: spacing.md,
    },
    modalHeaderIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    modalHeaderText: {
        flex: 1,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    modalSubtitle: {
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: {
        paddingHorizontal: spacing.lg,
        maxHeight: 450,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    inputIcon: {
        marginLeft: spacing.sm,
    },
    inputFlat: {
        flex: 1,
        borderWidth: 0,
        backgroundColor: 'transparent',
        marginBottom: 0,
    },
    dateRow: {
        flexDirection: 'row',
    },
    documentPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    documentIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    documentTextWrapper: {
        flex: 1,
    },
    documentPickerText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    documentPickerHint: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    documentRemoveBtn: {
        padding: spacing.xs,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        marginTop: spacing.md,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    modalSaveBtn: {
        flex: 2,
        overflow: 'hidden',
        borderRadius: borderRadius.lg,
    },
    modalSaveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.xs,
    },
    modalSaveText: {
        color: '#fff',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold as any,
    },
    // Cert Modal Styles
    certModalContent: {
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        maxHeight: '90%',
        minHeight: 500,
    },
    certModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    certModalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    certModalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    certModalClose: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    certInputGroup: {
        marginBottom: spacing.md,
    },
    certInputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    certInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        minHeight: 48,
        gap: spacing.sm,
    },
    certTextInput: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        paddingVertical: spacing.xs,
    },
    certDocPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        gap: spacing.sm,
    },
    certDocIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    certDocText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    certModalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
    },
    certCancelBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    certSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
});
