/**
 * Google Sign-In Service for Expo
 *
 * Uses expo-auth-session for OAuth 2.0 authentication with Google.
 * This approach works in Expo Go and production builds.
 *
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com)
 * 2. Create a new project or select existing one
 * 3. Enable Google+ API
 * 4. Go to Credentials > Create Credentials > OAuth Client ID
 * 5. For Web application (required for Expo):
 *    - Authorized JavaScript origins: https://auth.expo.io
 *    - Authorized redirect URIs: https://auth.expo.io/@your-username/your-app-slug
 * 6. For Android:
 *    - Create Android OAuth Client ID
 *    - Package name: your.app.package.name
 *    - SHA-1 certificate fingerprint (get from keystore)
 * 7. For iOS:
 *    - Create iOS OAuth Client ID
 *    - Bundle ID: your.app.bundle.id
 * 8. Copy the Web Client ID to the GOOGLE_WEB_CLIENT_ID below
 */

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

// Complete the auth session to handle redirect
WebBrowser.maybeCompleteAuthSession();

// Generate redirect URI - for Expo Go this will be exp:// format
// For standalone builds this will use the custom scheme
const redirectUri = makeRedirectUri({
    scheme: 'jobapp',
    path: 'redirect',
});

console.log('Google OAuth Redirect URI:', redirectUri);

// Configuration - Read from environment variables (EXPO_PUBLIC_ prefix)
// For Expo Go development, the webClientId is used for all platforms
const GOOGLE_CONFIG = {
    // Web Client ID (required for all platforms in Expo Go)
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '268744551408-ecqo5l2dn702t61q5m70ptfpj70q7vds.apps.googleusercontent.com',

    // Android Client ID (optional, for production Android builds)
    // Falls back to webClientId for Expo Go
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',

    // iOS Client ID (optional, for production iOS builds)
    // Falls back to webClientId for Expo Go
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
};

// Debug: Log configuration on load
console.log('Google Auth Config:', {
    webClientId: GOOGLE_CONFIG.webClientId ? GOOGLE_CONFIG.webClientId.substring(0, 20) + '...' : 'NOT SET',
    hasAndroidId: !!GOOGLE_CONFIG.androidClientId,
    hasIosId: !!GOOGLE_CONFIG.iosClientId,
});

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    givenName: string;
    familyName: string;
    picture: string;
}

export interface GoogleAuthResult {
    success: boolean;
    accessToken?: string;
    idToken?: string;
    user?: GoogleUser;
    error?: string;
}

/**
 * Hook to use Google Sign-In
 * Returns request, response, and promptAsync function
 *
 * IMPORTANT: Add the redirect URI shown in console to Google Cloud Console:
 * - Go to Google Cloud Console > APIs & Services > Credentials
 * - Edit your OAuth 2.0 Client ID (Web application)
 * - Add the redirect URI to "Authorized redirect URIs"
 *
 * Common redirect URI formats:
 * - Expo Go: exp://192.168.x.x:8081/--/redirect (your local IP)
 * - Production: jobapp://redirect
 */
export function useGoogleAuth() {
    console.log('=== Google OAuth Debug ===');
    console.log('Redirect URI:', redirectUri);
    console.log('ENV value:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'NOT SET');
    console.log('Client ID being used:', GOOGLE_CONFIG.webClientId);
    console.log('Add this exact URI to Google Cloud Console!');
    console.log('===========================');

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: GOOGLE_CONFIG.webClientId,
        webClientId: GOOGLE_CONFIG.webClientId,
        scopes: ['profile', 'email'],
        redirectUri: redirectUri,
    });

    // Debug logging when request is ready
    if (request) {
        console.log('Google Auth Request ready - redirectUri:', request.redirectUri);
    }

    return { request, response, promptAsync, redirectUri };
}

/**
 * Fetch user info from Google using access token
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUser | null> {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const data = await response.json();

        return {
            id: data.sub,
            email: data.email,
            name: data.name,
            givenName: data.given_name,
            familyName: data.family_name,
            picture: data.picture,
        };
    } catch (error) {
        console.error('Error fetching Google user info:', error);
        return null;
    }
}

/**
 * Process the auth response and return structured result
 */
export async function processGoogleAuthResponse(
    response: Google.AuthSessionResult | null
): Promise<GoogleAuthResult> {
    if (!response) {
        return { success: false, error: 'No response from Google' };
    }

    if (response.type === 'cancel') {
        return { success: false, error: 'User cancelled the sign-in' };
    }

    if (response.type === 'dismiss') {
        return { success: false, error: 'Sign-in was dismissed' };
    }

    if (response.type !== 'success') {
        return { success: false, error: 'Sign-in failed' };
    }

    const { authentication } = response;

    if (!authentication?.accessToken) {
        return { success: false, error: 'No access token received' };
    }

    // Fetch user info
    const user = await fetchGoogleUserInfo(authentication.accessToken);

    if (!user) {
        return { success: false, error: 'Failed to get user information' };
    }

    return {
        success: true,
        accessToken: authentication.accessToken,
        idToken: authentication.idToken || undefined,
        user,
    };
}

export default {
    useGoogleAuth,
    fetchGoogleUserInfo,
    processGoogleAuthResponse,
    GOOGLE_CONFIG,
};
