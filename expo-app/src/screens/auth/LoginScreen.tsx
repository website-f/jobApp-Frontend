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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import authService from '../../services/authService';
import { useGoogleAuth, processGoogleAuthResponse } from '../../services/googleAuth';
import { useAuthStore, useColors } from '../../store';

type LoginScreenProps = {
    navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { setUser } = useAuthStore();
    const colors = useColors();

    // Google Sign-In hook
    const { request: googleRequest, response: googleResponse, promptAsync: promptGoogleAsync, redirectUri } = useGoogleAuth();

    // Handle Google Sign-In response
    useEffect(() => {
        const handleGoogleResponse = async () => {
            if (googleResponse) {
                setGoogleLoading(true);
                try {
                    const result = await processGoogleAuthResponse(googleResponse);

                    if (result.success && result.accessToken) {
                        // Send to backend for authentication
                        const response = await authService.socialAuth({
                            provider: 'google',
                            access_token: result.accessToken,
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
                    setGoogleLoading(false);
                }
            }
        };

        handleGoogleResponse();
    }, [googleResponse]);

    const handleGoogleSignIn = async () => {
        if (!googleRequest) {
            Alert.alert(
                'Configuration Required',
                'Google Sign-In is not configured. Please add your Google OAuth credentials.'
            );
            return;
        }

        // Log the redirect URI for debugging
        console.log('Starting Google Sign-In with redirect URI:', redirectUri);

        try {
            await promptGoogleAsync();
        } catch (error: any) {
            console.error('Google prompt error:', error);
            // Show the redirect URI that needs to be added to Google Console
            Alert.alert(
                'Google Sign-In Error',
                `Error: ${error.message}\n\nMake sure this redirect URI is added in Google Cloud Console:\n${redirectUri}`
            );
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Attempting login for:', email);
            const response = await authService.login({ email, password });
            console.log('Login response:', response);
            if (response.access) {
                const user = await authService.me();
                console.log('User fetched:', user);
                setUser(user);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            console.error('Error response:', error.response?.data);
            const message = error.response?.data?.detail ||
                error.response?.data?.message ||
                error.response?.data?.non_field_errors?.[0] ||
                error.message ||
                'Login failed. Please check your credentials.';
            Alert.alert('Error', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: 40, marginTop: 40 }}>
                        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: 20 }}>
                            JobApp
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                            Welcome Back
                        </Text>
                        <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                            Sign in to continue
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={{ marginBottom: 30 }}>
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Email
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: colors.text,
                                }}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                                Password
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: colors.inputBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: colors.text,
                                }}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
                            <Text style={{ color: colors.primary, fontWeight: '500' }}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                backgroundColor: isLoading ? colors.textMuted : colors.primary,
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Social Login */}
                    <View style={{ marginBottom: 30 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                            <Text style={{ marginHorizontal: 16, color: colors.textSecondary }}>or continue with</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: googleLoading ? colors.surface : colors.card,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                                onPress={handleGoogleSignIn}
                                disabled={googleLoading || !googleRequest}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <>
                                        <Text style={{ fontSize: 18 }}>G</Text>
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>Google</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={{
                                flex: 1,
                                backgroundColor: colors.card,
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8,
                            }}>
                                <Text style={{ fontSize: 18, color: '#0077B5' }}>in</Text>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>LinkedIn</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Register Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                        <Text style={{ color: colors.textSecondary }}>Don't have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register', {})}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
