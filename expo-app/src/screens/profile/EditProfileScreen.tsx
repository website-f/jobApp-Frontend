import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore, useProfileStore, useColors, spacing, typography, borderRadius } from '../../store';
import profileService from '../../services/profileService';
import {
    Card,
    Input,
    Button,
    LoadingSpinner,
    SectionHeader,
} from '../../components/ui';

type EditProfileRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute<EditProfileRouteProp>();
    const section = route.params?.section || 'basic';
    const { user } = useAuthStore();
    const { profile, setProfile } = useProfileStore();
    const [isSaving, setIsSaving] = useState(false);
    const colors = useColors();

    const isSeeker = user?.user_type === 'seeker';

    // Determine page title and icon based on section
    const getSectionInfo = () => {
        switch (section) {
            case 'about':
                return { title: 'About Me', icon: 'person-outline' as const, subtitle: 'Tell employers about yourself' };
            case 'location':
                return { title: 'Location', icon: 'location-outline' as const, subtitle: 'Set your work location' };
            default:
                return { title: 'Edit Profile', icon: 'create-outline' as const, subtitle: 'Update your information' };
        }
    };

    const sectionInfo = getSectionInfo();

    // Form state
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        display_name: '',
        headline: '',
        bio: '',
        city: '',
        state: '',
        country: '',
        hourly_rate_min: '',
        hourly_rate_max: '',
        rate_currency: 'USD',
        availability_status: 'available' as 'available' | 'busy' | 'not_available',
    });

    useEffect(() => {
        if (profile?.profile) {
            const p = profile.profile as any;
            setFormData({
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                display_name: p.display_name || '',
                headline: p.headline || '',
                bio: p.bio || '',
                city: p.address?.city || p.city || '',
                state: p.address?.state || p.state || '',
                country: p.address?.country || p.country || '',
                hourly_rate_min: p.rates?.hourly_rate_min?.toString() || p.hourly_rate_min?.toString() || '',
                hourly_rate_max: p.rates?.hourly_rate_max?.toString() || p.hourly_rate_max?.toString() || '',
                rate_currency: p.rates?.rate_currency || p.rate_currency || 'USD',
                availability_status: p.availability_status || 'available',
            });
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updateData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                display_name: formData.display_name,
                headline: formData.headline,
                bio: formData.bio,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                hourly_rate_min: formData.hourly_rate_min ? parseFloat(formData.hourly_rate_min) : undefined,
                hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : undefined,
                rate_currency: formData.rate_currency,
                availability_status: formData.availability_status,
            };

            await profileService.updateSeekerProfile(updateData);
            const fullProfile = await profileService.getFullProfile();
            setProfile(fullProfile);
            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const availabilityOptions = [
        { value: 'available', label: 'Available', color: colors.success, icon: 'checkmark-circle' as const },
        { value: 'busy', label: 'Busy', color: colors.warning, icon: 'time' as const },
        { value: 'not_available', label: 'Unavailable', color: colors.error, icon: 'close-circle' as const },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{sectionInfo.title}</Text>
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.headerButton}>
                        {isSaving ? (
                            <LoadingSpinner size="sm" />
                        ) : (
                            <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Section Header Card */}
                    <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.sectionHeaderCard}
                    >
                        <View style={styles.sectionHeaderIcon}>
                            <Ionicons name={sectionInfo.icon} size={24} color="#fff" />
                        </View>
                        <Text style={styles.sectionHeaderTitle}>{sectionInfo.title}</Text>
                        <Text style={styles.sectionHeaderSubtitle}>{sectionInfo.subtitle}</Text>
                    </LinearGradient>

                    {/* Basic Info */}
                    {(section === 'basic' || section === 'about') && (
                        <View style={styles.section}>
                            <SectionHeader title="Basic Information" icon="person-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <View style={styles.row}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="First Name"
                                            value={formData.first_name}
                                            onChangeText={(v) => updateField('first_name', v)}
                                            placeholder="First name"
                                            leftIcon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Last Name"
                                            value={formData.last_name}
                                            onChangeText={(v) => updateField('last_name', v)}
                                            placeholder="Last name"
                                        />
                                    </View>
                                </View>

                                {isSeeker && (
                                    <>
                                        <Input
                                            label="Display Name"
                                            value={formData.display_name}
                                            onChangeText={(v) => updateField('display_name', v)}
                                            placeholder="How you want to be called"
                                            hint="This is how employers will see your name"
                                            leftIcon={<Ionicons name="at-outline" size={18} color={colors.textMuted} />}
                                        />

                                        <Input
                                            label="Professional Headline"
                                            value={formData.headline}
                                            onChangeText={(v) => updateField('headline', v)}
                                            placeholder="e.g., Senior Developer | React Specialist"
                                            hint="A brief title that describes what you do"
                                            leftIcon={<Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />}
                                        />

                                        <Input
                                            label="About Me"
                                            value={formData.bio}
                                            onChangeText={(v) => updateField('bio', v)}
                                            placeholder="Tell employers about yourself, your experience, and what you're looking for..."
                                            multiline
                                            numberOfLines={5}
                                            style={{ minHeight: 120 }}
                                        />
                                    </>
                                )}
                            </Card>
                        </View>
                    )}

                    {/* Location */}
                    {(section === 'basic' || section === 'location') && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Location" icon="location-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <Input
                                    label="City"
                                    value={formData.city}
                                    onChangeText={(v) => updateField('city', v)}
                                    placeholder="Your city"
                                    leftIcon={<Ionicons name="business-outline" size={18} color={colors.textMuted} />}
                                />

                                <View style={styles.row}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="State/Province"
                                            value={formData.state}
                                            onChangeText={(v) => updateField('state', v)}
                                            placeholder="State"
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Country"
                                            value={formData.country}
                                            onChangeText={(v) => updateField('country', v)}
                                            placeholder="Country"
                                        />
                                    </View>
                                </View>
                            </Card>
                        </View>
                    )}

                    {/* Hourly Rate */}
                    {section === 'basic' && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Hourly Rate" icon="cash-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <View style={styles.row}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label={`Min Rate (${formData.rate_currency})`}
                                            value={formData.hourly_rate_min}
                                            onChangeText={(v) => updateField('hourly_rate_min', v)}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            leftIcon={<Text style={{ color: colors.textMuted }}>$</Text>}
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label={`Max Rate (${formData.rate_currency})`}
                                            value={formData.hourly_rate_max}
                                            onChangeText={(v) => updateField('hourly_rate_max', v)}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            leftIcon={<Text style={{ color: colors.textMuted }}>$</Text>}
                                        />
                                    </View>
                                </View>
                                <Text style={[styles.hint, { color: colors.textMuted }]}>
                                    Set your expected hourly rate range for employers
                                </Text>
                            </Card>
                        </View>
                    )}

                    {/* Availability */}
                    {section === 'basic' && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Availability Status" icon="calendar-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <View style={styles.availabilityGrid}>
                                    {availabilityOptions.map((option) => {
                                        const isSelected = formData.availability_status === option.value;
                                        return (
                                            <TouchableOpacity
                                                key={option.value}
                                                style={[
                                                    styles.availabilityOption,
                                                    {
                                                        backgroundColor: isSelected ? option.color + '15' : colors.surfaceHover,
                                                        borderColor: isSelected ? option.color : colors.border,
                                                    },
                                                ]}
                                                onPress={() => updateField('availability_status', option.value)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={option.icon}
                                                    size={24}
                                                    color={isSelected ? option.color : colors.textMuted}
                                                />
                                                <Text
                                                    style={[
                                                        styles.availabilityLabel,
                                                        { color: isSelected ? option.color : colors.text },
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </Card>
                        </View>
                    )}

                    {/* Save Button */}
                    <View style={styles.saveSection}>
                        <Button
                            title="Save Changes"
                            onPress={handleSave}
                            loading={isSaving}
                            variant="primary"
                            size="lg"
                            leftIcon={<Ionicons name="checkmark" size={20} color="#fff" />}
                            style={styles.saveButtonFull}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 60,
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold as any,
    },
    saveButton: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    sectionHeaderCard: {
        margin: spacing.lg,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
    },
    sectionHeaderIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    sectionHeaderTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold as any,
        color: '#fff',
        marginBottom: spacing.xs,
    },
    sectionHeaderSubtitle: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.85)',
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    formCard: {
        marginTop: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    halfInput: {
        flex: 1,
    },
    hint: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
    availabilityGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    availabilityOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        gap: spacing.xs,
    },
    availabilityLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold as any,
    },
    saveSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    saveButtonFull: {
        width: '100%',
    },
});
