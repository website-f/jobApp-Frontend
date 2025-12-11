import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore, useProfileStore, useColors } from '../../store';
import profileService from '../../services/profileService';

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

    // Determine page title based on section
    const getTitle = () => {
        switch (section) {
            case 'about': return 'Edit About';
            case 'location': return 'Edit Location';
            default: return 'Edit Profile';
        }
    };

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

    const inputStyle = {
        backgroundColor: colors.inputBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                        <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{getTitle()}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {/* Basic Info - shown for 'basic' or 'about' sections */}
                    {(section === 'basic' || section === 'about') && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
                                {section === 'about' ? 'About Me' : 'Basic Information'}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>First Name</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.first_name}
                                        onChangeText={(v) => updateField('first_name', v)}
                                        placeholder="First name"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Last Name</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.last_name}
                                        onChangeText={(v) => updateField('last_name', v)}
                                        placeholder="Last name"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                            </View>

                            {isSeeker && (
                                <>
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Display Name</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={formData.display_name}
                                            onChangeText={(v) => updateField('display_name', v)}
                                            placeholder="How you want to be called"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>

                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Professional Headline</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={formData.headline}
                                            onChangeText={(v) => updateField('headline', v)}
                                            placeholder="e.g., Senior Developer | React Specialist"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>

                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>About Me</Text>
                                        <TextInput
                                            style={[inputStyle, { minHeight: 100, paddingTop: 14 }]}
                                            value={formData.bio}
                                            onChangeText={(v) => updateField('bio', v)}
                                            placeholder="Tell employers about yourself..."
                                            placeholderTextColor={colors.textMuted}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {/* Location - shown for 'basic' or 'location' sections */}
                    {(section === 'basic' || section === 'location') && isSeeker && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Location</Text>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>City</Text>
                                <TextInput
                                    style={inputStyle}
                                    value={formData.city}
                                    onChangeText={(v) => updateField('city', v)}
                                    placeholder="Your city"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>State/Province</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.state}
                                        onChangeText={(v) => updateField('state', v)}
                                        placeholder="State"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Country</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.country}
                                        onChangeText={(v) => updateField('country', v)}
                                        placeholder="Country"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Rates */}
                    {isSeeker && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Hourly Rate</Text>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Min Rate ({formData.rate_currency})</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.hourly_rate_min}
                                        onChangeText={(v) => updateField('hourly_rate_min', v)}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1, marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Max Rate ({formData.rate_currency})</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={formData.hourly_rate_max}
                                        onChangeText={(v) => updateField('hourly_rate_max', v)}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Availability */}
                    {isSeeker && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Availability Status</Text>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {(['available', 'busy', 'not_available'] as const).map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            backgroundColor: formData.availability_status === status ? colors.primaryLight : colors.card,
                                            borderRadius: 12,
                                            paddingVertical: 14,
                                            borderWidth: 2,
                                            borderColor: formData.availability_status === status ? colors.primary : colors.cardBorder,
                                        }}
                                        onPress={() => updateField('availability_status', status)}
                                    >
                                        <View style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 5,
                                            backgroundColor: status === 'available' ? colors.success : status === 'busy' ? colors.warning : colors.error,
                                        }} />
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: formData.availability_status === status ? colors.text : colors.textSecondary,
                                        }}>
                                            {status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Not Available'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
