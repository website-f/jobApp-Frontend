import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import authService from '../../services/authService';
import { useGoogleAuth, processGoogleAuthResponse } from '../../services/googleAuth';
import { useAuthStore, useColors } from '../../store';

type RegisterScreenProps = {
    navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
    route: RouteProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation, route }: RegisterScreenProps) {
    const [userType, setUserType] = useState<'seeker' | 'employer'>(route.params?.userType || 'seeker');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [employerName, setEmployerName] = useState('');
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { setUser } = useAuthStore();
    const colors = useColors();

    // Google Sign-In hook - uses shared service
    const { request, response: googleResponse, promptAsync } = useGoogleAuth();

    // Handle Google Sign-In response
    useEffect(() => {
        const handleGoogleResponse = async () => {
            if (googleResponse) {
                setIsGoogleLoading(true);
                try {
                    const result = await processGoogleAuthResponse(googleResponse);

                    if (result.success && result.accessToken) {
                        // Send to backend for authentication
                        const response = await authService.socialAuth({
                            provider: 'google',
                            access_token: result.accessToken,
                            user_type: userType,
                        });

                        if (response.access) {
                            const user = await authService.me();
                            setUser(user);
                        }
                    } else if (result.error && result.error !== 'User cancelled the sign-in') {
                        Alert.alert('Google Sign-In Error', result.error);
                    }
                } catch (error: any) {
                    console.error('Google auth error:', error);
                    const message = error.response?.data?.detail ||
                        error.response?.data?.error ||
                        error.message ||
                        'Google sign-in failed';
                    Alert.alert('Error', message);
                } finally {
                    setIsGoogleLoading(false);
                }
            }
        };

        handleGoogleResponse();
    }, [googleResponse]);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setBirthDate(selectedDate);
        }
    };

    const validatePhone = (phoneNumber: string) => {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    };

    const handleGoogleSignIn = async () => {
        if (!request) {
            Alert.alert(
                'Configuration Required',
                'Google Sign-In is not configured. Please add your Google OAuth credentials.'
            );
            return;
        }
        await promptAsync();
    };

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        // Phone is now required
        if (!phone) {
            Alert.alert('Error', 'Phone number is required');
            return;
        }

        if (!validatePhone(phone)) {
            Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        if (userType === 'employer' && !companyName) {
            Alert.alert('Error', 'Please enter your company name');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.register({
                email,
                password,
                password_confirmation: confirmPassword,
                user_type: userType,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                company_name: userType === 'employer' ? companyName : undefined,
                employer_name: userType === 'employer' ? employerName : undefined,
                date_of_birth: birthDate ? birthDate.toISOString().split('T')[0] : undefined,
                location: location || undefined,
            });

            if (response.success) {
                setUser(response.data.user);
                Alert.alert('Success', 'Registration successful! Please verify your email.');
            } else {
                Alert.alert('Error', response.message || 'Registration failed');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setIsLoading(false);
        }
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
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={{ marginBottom: 30 }}>
                        <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => navigation.goBack()}>
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                            Create Account
                        </Text>
                        <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                            Sign up to get started
                        </Text>
                    </View>

                    {/* User Type Selection */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                            I am a...
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: userType === 'seeker' ? colors.primaryLight : colors.card,
                                    borderRadius: 12,
                                    padding: 16,
                                    borderWidth: 2,
                                    borderColor: userType === 'seeker' ? colors.primary : colors.cardBorder,
                                }}
                                onPress={() => setUserType('seeker')}
                            >
                                <Text style={{
                                    color: userType === 'seeker' ? colors.primary : colors.textSecondary,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    marginBottom: 4,
                                }}>
                                    Job Seeker
                                </Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Looking for opportunities</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: userType === 'employer' ? colors.primaryLight : colors.card,
                                    borderRadius: 12,
                                    padding: 16,
                                    borderWidth: 2,
                                    borderColor: userType === 'employer' ? colors.primary : colors.cardBorder,
                                }}
                                onPress={() => setUserType('employer')}
                            >
                                <Text style={{
                                    color: userType === 'employer' ? colors.primary : colors.textSecondary,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    marginBottom: 4,
                                }}>
                                    Employer
                                </Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Hiring talent</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Google Sign In */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            paddingVertical: 14,
                            borderWidth: 1,
                            borderColor: colors.border,
                            marginBottom: 20,
                            gap: 12,
                        }}
                        onPress={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <ActivityIndicator color={colors.text} />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={20} color="#DB4437" />
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        <Text style={{ color: colors.textMuted, paddingHorizontal: 16, fontSize: 14 }}>or</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                    </View>

                    {/* Form */}
                    <View style={{ marginBottom: 30 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                    First Name *
                                </Text>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="First name"
                                    placeholderTextColor={colors.textMuted}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>
                            <View style={{ flex: 1, marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                    Last Name *
                                </Text>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="Last name"
                                    placeholderTextColor={colors.textMuted}
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Email *
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Phone Number *
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Enter your phone number"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                                Required for account verification
                            </Text>
                        </View>

                        {/* Birth Date */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Date of Birth
                            </Text>
                            <TouchableOpacity
                                style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: birthDate ? colors.text : colors.textMuted, fontSize: 16 }}>
                                    {birthDate ? formatDate(birthDate) : 'Select your birth date'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Date Picker Modal */}
                        {showDatePicker && (
                            <Modal
                                transparent
                                animationType="slide"
                                visible={showDatePicker}
                                onRequestClose={() => setShowDatePicker(false)}
                            >
                                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                <Text style={{ color: colors.error, fontSize: 16 }}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={birthDate || new Date(2000, 0, 1)}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleDateChange}
                                            maximumDate={new Date()}
                                            minimumDate={new Date(1940, 0, 1)}
                                        />
                                    </View>
                                </View>
                            </Modal>
                        )}

                        {/* Location */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Location
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="City, State/Country"
                                placeholderTextColor={colors.textMuted}
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>

                        {/* Employer-specific Fields */}
                        {userType === 'employer' && (
                            <>
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        Your Name (Employer) *
                                    </Text>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder="Your full name"
                                        placeholderTextColor={colors.textMuted}
                                        value={employerName}
                                        onChangeText={setEmployerName}
                                    />
                                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                                        Displayed alongside your company name
                                    </Text>
                                </View>
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                        Company Name *
                                    </Text>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder="Enter your company name"
                                        placeholderTextColor={colors.textMuted}
                                        value={companyName}
                                        onChangeText={setCompanyName}
                                    />
                                </View>
                            </>
                        )}

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Password *
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Create a password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                                Must be at least 8 characters with numbers and mixed case
                            </Text>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Confirm Password *
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Confirm your password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: isLoading ? colors.textMuted : colors.primary,
                                borderRadius: 12,
                                paddingVertical: 16,
                                alignItems: 'center',
                                marginTop: 8,
                            }}
                            onPress={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Create Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 20 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
