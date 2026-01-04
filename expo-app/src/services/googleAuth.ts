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
import Constants from 'expo-constants';

// Complete the auth session to handle redirect
WebBrowser.maybeCompleteAuthSession();

// Configuration - Replace with your actual Google OAuth credentials
// These should ideally come from environment variables or a config file
const GOOGLE_CONFIG = {
    // Web Client ID (required for all platforms in Expo)
    webClientId: Constants.expoConfig?.extra?.googleWebClientId ||
        'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',

    // Android Client ID (optional, for native Android)
    androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId ||
        'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',

    // iOS Client ID (optional, for native iOS)
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId ||
        'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
};

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
 */
export function useGoogleAuth() {
    const redirectUri = makeRedirectUri({
        scheme: Constants.expoConfig?.scheme || 'expo',
        path: 'auth/google',
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_CONFIG.webClientId,
        androidClientId: GOOGLE_CONFIG.androidClientId,
        iosClientId: GOOGLE_CONFIG.iosClientId,
        scopes: ['profile', 'email'],
        redirectUri,
    });

    return { request, response, promptAsync };
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
