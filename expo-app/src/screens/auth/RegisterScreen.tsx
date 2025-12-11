import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import authService from '../../services/authService';
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
    const [isLoading, setIsLoading] = useState(false);
    const { setUser } = useAuthStore();
    const colors = useColors();

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
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
                phone: phone || undefined,
                company_name: userType === 'employer' ? companyName : undefined,
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
                    <View style={{ marginBottom: 24 }}>
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
                                Phone (Optional)
                            </Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Enter your phone number"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        {userType === 'employer' && (
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
