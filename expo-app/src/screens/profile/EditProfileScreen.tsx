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
    ActivityIndicator,
    Image,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
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

    // Intro video state
    const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);

    // Profile picture state
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);

    // Languages state
    const [languages, setLanguages] = useState<string[]>([]);
    const [newLanguage, setNewLanguage] = useState('');

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
        phone: '',
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
                phone: user?.phone || '',
            });
            // Set intro video URL
            if (p.intro_video_url) {
                setIntroVideoUrl(p.intro_video_url);
            }
            // Set avatar URL
            if (p.avatar_url) {
                setAvatarUrl(p.avatar_url);
            }
            // Set date of birth
            if (p.date_of_birth) {
                setDateOfBirth(new Date(p.date_of_birth));
            }
            // Set languages
            if (p.languages_spoken && Array.isArray(p.languages_spoken)) {
                setLanguages(p.languages_spoken);
            }
        }
    }, [profile, user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updateData: any = {
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
                languages_spoken: languages,
            };

            // Add date of birth if set
            if (dateOfBirth) {
                updateData.date_of_birth = dateOfBirth.toISOString().split('T')[0];
            }

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

    const handleUploadIntroVideo = async () => {
        try {
            // Request permissions
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your media library to upload a video.');
                return;
            }

            // Pick video
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 0.8,
                videoMaxDuration: 60, // Max 60 seconds
            });

            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const video = result.assets[0];

            // Check file size (max 100MB)
            if (video.fileSize && video.fileSize > 100 * 1024 * 1024) {
                Alert.alert('File Too Large', 'Please select a video smaller than 100MB.');
                return;
            }

            setIsUploadingVideo(true);

            // Create FormData
            const formData = new FormData();
            formData.append('video', {
                uri: video.uri,
                type: video.mimeType || 'video/mp4',
                name: `intro_video.${video.uri.split('.').pop() || 'mp4'}`,
            } as any);

            // Upload
            const response = await profileService.uploadIntroVideo(formData);
            setIntroVideoUrl(response.intro_video_url);

            // Refresh profile
            const fullProfile = await profileService.getFullProfile();
            setProfile(fullProfile);

            Alert.alert('Success', 'Intro video uploaded successfully!');
        } catch (error: any) {
            console.error('Video upload error:', error);
            Alert.alert('Upload Failed', error?.response?.data?.error || 'Failed to upload video. Please try again.');
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleRemoveIntroVideo = async () => {
        Alert.alert(
            'Remove Video',
            'Are you sure you want to remove your intro video?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await profileService.updateSeekerProfile({ intro_video_url: '' });
                            setIntroVideoUrl(null);
                            const fullProfile = await profileService.getFullProfile();
                            setProfile(fullProfile);
                            Alert.alert('Success', 'Intro video removed.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove video.');
                        }
                    },
                },
            ]
        );
    };

    // Avatar upload handler
    const handleUploadAvatar = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your media library to upload a photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const image = result.assets[0];
            setIsUploadingAvatar(true);

            const formData = new FormData();
            formData.append('avatar', {
                uri: image.uri,
                type: image.mimeType || 'image/jpeg',
                name: `avatar.${image.uri.split('.').pop() || 'jpg'}`,
            } as any);

            const response = await profileService.uploadAvatar(formData);
            setAvatarUrl(response.avatar_url);

            const fullProfile = await profileService.getFullProfile();
            setProfile(fullProfile);
            Alert.alert('Success', 'Profile photo updated!');
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            Alert.alert('Upload Failed', error?.response?.data?.error || 'Failed to upload photo. Please try again.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // Date picker handlers
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDateOfBirth(selectedDate);
        }
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return 'Not set';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Language management
    const addLanguage = () => {
        const lang = newLanguage.trim();
        if (lang && !languages.includes(lang)) {
            setLanguages([...languages, lang]);
            setNewLanguage('');
        }
    };

    const removeLanguage = (lang: string) => {
        setLanguages(languages.filter((l) => l !== lang));
    };

    // Common languages for quick selection
    const commonLanguages = ['English', 'Mandarin', 'Malay', 'Tamil', 'Hindi', 'Spanish', 'French', 'Arabic', 'Japanese', 'Korean'];

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

                    {/* Profile Photo */}
                    {section === 'basic' && (
                        <View style={styles.section}>
                            <SectionHeader title="Profile Photo" icon="camera-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <View style={styles.avatarSection}>
                                    <TouchableOpacity
                                        style={styles.avatarContainer}
                                        onPress={handleUploadAvatar}
                                        disabled={isUploadingAvatar}
                                    >
                                        {isUploadingAvatar ? (
                                            <ActivityIndicator size="large" color={colors.primary} />
                                        ) : avatarUrl ? (
                                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                                                <Ionicons name="person" size={40} color={colors.primary} />
                                            </View>
                                        )}
                                        <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                                            <Ionicons name="camera" size={16} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                    <View style={styles.avatarInfo}>
                                        <Text style={[styles.avatarTitle, { color: colors.text }]}>
                                            Profile Picture
                                        </Text>
                                        <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
                                            Tap to upload a new photo
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </View>
                    )}

                    {/* Contact Information */}
                    {section === 'basic' && (
                        <View style={styles.section}>
                            <SectionHeader title="Contact Information" icon="call-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <Input
                                    label="Email"
                                    value={user?.email || ''}
                                    editable={false}
                                    placeholder="Your email"
                                    leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
                                    hint="Email cannot be changed"
                                />

                                <Input
                                    label="Phone Number"
                                    value={formData.phone}
                                    onChangeText={(v) => updateField('phone', v)}
                                    placeholder="+60 12 345 6789"
                                    keyboardType="phone-pad"
                                    leftIcon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />}
                                />
                            </Card>
                        </View>
                    )}

                    {/* Birthdate */}
                    {section === 'basic' && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Date of Birth" icon="calendar-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <TouchableOpacity
                                    style={[styles.datePickerButton, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                    <View style={styles.datePickerText}>
                                        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                                        <Text style={[styles.dateValue, { color: colors.text }]}>
                                            {formatDate(dateOfBirth)}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                </TouchableOpacity>

                                {showDatePicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={dateOfBirth || new Date(2000, 0, 1)}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                    />
                                )}
                            </Card>
                        </View>
                    )}

                    {/* iOS Date Picker Modal */}
                    {Platform.OS === 'ios' && (
                        <Modal
                            visible={showDatePicker}
                            transparent
                            animationType="slide"
                        >
                            <View style={styles.modalOverlay}>
                                <View style={[styles.datePickerModal, { backgroundColor: colors.card }]}>
                                    <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text style={[styles.datePickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.datePickerTitle, { color: colors.text }]}>Date of Birth</Text>
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text style={[styles.datePickerDone, { color: colors.primary }]}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={dateOfBirth || new Date(2000, 0, 1)}
                                        mode="date"
                                        display="spinner"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                        style={{ height: 200 }}
                                    />
                                </View>
                            </View>
                        </Modal>
                    )}

                    {/* Languages Spoken */}
                    {section === 'basic' && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Languages Spoken" icon="language-outline" />

                            <Card variant="default" style={styles.formCard}>
                                {/* Current languages */}
                                {languages.length > 0 && (
                                    <View style={styles.languagesList}>
                                        {languages.map((lang) => (
                                            <View key={lang} style={[styles.languageChip, { backgroundColor: colors.primaryLight }]}>
                                                <Text style={[styles.languageChipText, { color: colors.primary }]}>{lang}</Text>
                                                <TouchableOpacity onPress={() => removeLanguage(lang)}>
                                                    <Ionicons name="close-circle" size={18} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add language input */}
                                <View style={styles.addLanguageRow}>
                                    <View style={{ flex: 1 }}>
                                        <Input
                                            placeholder="Add a language..."
                                            value={newLanguage}
                                            onChangeText={setNewLanguage}
                                            onSubmitEditing={addLanguage}
                                            leftIcon={<Ionicons name="add" size={18} color={colors.textMuted} />}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.addLanguageButton, { backgroundColor: colors.primary }]}
                                        onPress={addLanguage}
                                    >
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Common languages quick add */}
                                <Text style={[styles.hint, { color: colors.textMuted, marginTop: spacing.md }]}>
                                    Quick add:
                                </Text>
                                <View style={styles.quickLanguages}>
                                    {commonLanguages.filter((l) => !languages.includes(l)).slice(0, 6).map((lang) => (
                                        <TouchableOpacity
                                            key={lang}
                                            style={[styles.quickLanguageChip, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                                            onPress={() => setLanguages([...languages, lang])}
                                        >
                                            <Text style={[styles.quickLanguageText, { color: colors.text }]}>{lang}</Text>
                                            <Ionicons name="add" size={14} color={colors.primary} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Card>
                        </View>
                    )}

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

                    {/* Intro Video */}
                    {section === 'basic' && isSeeker && (
                        <View style={styles.section}>
                            <SectionHeader title="Intro Video" icon="videocam-outline" />

                            <Card variant="default" style={styles.formCard}>
                                <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                                    Upload a short video (max 60 seconds) to introduce yourself to potential employers.
                                    This helps you stand out from other candidates!
                                </Text>

                                {introVideoUrl ? (
                                    <View style={styles.videoContainer}>
                                        <Video
                                            source={{ uri: introVideoUrl }}
                                            style={styles.videoPlayer}
                                            useNativeControls
                                            resizeMode={ResizeMode.CONTAIN}
                                            isLooping={false}
                                        />
                                        <View style={styles.videoActions}>
                                            <TouchableOpacity
                                                style={[styles.videoActionButton, { backgroundColor: colors.primary }]}
                                                onPress={handleUploadIntroVideo}
                                                disabled={isUploadingVideo}
                                            >
                                                <Ionicons name="refresh" size={18} color="#fff" />
                                                <Text style={styles.videoActionText}>Replace</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.videoActionButton, { backgroundColor: colors.error }]}
                                                onPress={handleRemoveIntroVideo}
                                                disabled={isUploadingVideo}
                                            >
                                                <Ionicons name="trash" size={18} color="#fff" />
                                                <Text style={styles.videoActionText}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.uploadVideoButton,
                                            {
                                                backgroundColor: colors.surfaceHover,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                        onPress={handleUploadIntroVideo}
                                        disabled={isUploadingVideo}
                                    >
                                        {isUploadingVideo ? (
                                            <ActivityIndicator color={colors.primary} size="large" />
                                        ) : (
                                            <>
                                                <View
                                                    style={[
                                                        styles.uploadIconContainer,
                                                        { backgroundColor: colors.primary + '20' },
                                                    ]}
                                                >
                                                    <Ionicons name="videocam" size={32} color={colors.primary} />
                                                </View>
                                                <Text style={[styles.uploadVideoTitle, { color: colors.text }]}>
                                                    Upload Intro Video
                                                </Text>
                                                <Text style={[styles.uploadVideoHint, { color: colors.textMuted }]}>
                                                    MP4, MOV, AVI, WebM • Max 60 seconds • Max 100MB
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                                {isUploadingVideo && (
                                    <Text style={[styles.hint, { color: colors.primary, textAlign: 'center', marginTop: spacing.sm }]}>
                                        Uploading video... This may take a moment.
                                    </Text>
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
    // Video upload styles
    videoContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    videoPlayer: {
        width: '100%',
        height: 200,
        backgroundColor: '#000',
    },
    videoActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    videoActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.base,
        gap: spacing.xs,
    },
    videoActionText: {
        color: '#fff',
        fontWeight: typography.fontWeight.semibold as any,
        fontSize: typography.fontSize.sm,
    },
    uploadVideoButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    uploadIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    uploadVideoTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    uploadVideoHint: {
        fontSize: typography.fontSize.xs,
    },
    // Avatar styles
    avatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarInfo: {
        flex: 1,
    },
    avatarTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    avatarHint: {
        fontSize: typography.fontSize.sm,
    },
    // Date picker styles
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    datePickerText: {
        flex: 1,
    },
    dateLabel: {
        fontSize: typography.fontSize.xs,
        marginBottom: 2,
    },
    dateValue: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium as any,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    datePickerModal: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: spacing.xl,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    datePickerCancel: {
        fontSize: typography.fontSize.base,
    },
    datePickerTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    datePickerDone: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    // Language styles
    languagesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    languageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    languageChipText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    addLanguageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    addLanguageButton: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLanguages: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    quickLanguageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.base,
        borderWidth: 1,
        gap: 4,
    },
    quickLanguageText: {
        fontSize: typography.fontSize.xs,
    },
});
