import { Platform } from 'react-native';
import Constants from 'expo-constants';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================
// Set this to 'local' to use local Django server, 'production' for live server
// You can also override this with EXPO_PUBLIC_API_ENV environment variable
const DEFAULT_ENV: 'local' | 'production' = 'production';

// Your local machine's IP address (for physical device testing)
// Find it using: ipconfig (Windows) or ifconfig (Mac/Linux)
const LOCAL_MACHINE_IP = '192.168.1.100';

// Production API URL
const PRODUCTION_API_URL = 'https://jobappdemo.pythonanywhere.com/api/v1';

// Tunnel API URL (when using ngrok for Django backend)
// Run: ngrok http 8000 - then paste the URL here
const TUNNEL_API_URL = ''; // e.g., 'https://abc123.ngrok.io/api/v1'

// Local development port
const LOCAL_PORT = '8000';
// =============================================================================

const getEnvironment = (): 'local' | 'production' => {
    // Check for explicit environment override
    if (process.env.EXPO_PUBLIC_API_ENV === 'production') return 'production';
    if (process.env.EXPO_PUBLIC_API_ENV === 'local') return 'local';

    // In production builds, always use production API
    if (!__DEV__) return 'production';

    // Otherwise use default
    return DEFAULT_ENV;
};

const getLocalApiUrl = () => {
    // Check for explicit URL override first
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Try to get the debugger host from Expo (works for Expo Go and dev builds)
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];

    if (Platform.OS === 'android') {
        // Android emulator uses 10.0.2.2 to access host localhost
        // Physical devices need the actual IP
        if (debuggerHost && debuggerHost !== 'localhost') {
            return `http://${debuggerHost}:${LOCAL_PORT}/api/v1`;
        }
        return `http://10.0.2.2:${LOCAL_PORT}/api/v1`;
    }

    if (Platform.OS === 'ios') {
        // iOS simulator can use localhost
        // Physical devices need the actual IP
        if (debuggerHost && debuggerHost !== 'localhost') {
            return `http://${debuggerHost}:${LOCAL_PORT}/api/v1`;
        }
        return `http://localhost:${LOCAL_PORT}/api/v1`;
    }

    // Web - use localhost or debugger host
    if (debuggerHost) {
        return `http://${debuggerHost}:${LOCAL_PORT}/api/v1`;
    }
    return `http://localhost:${LOCAL_PORT}/api/v1`;
};

const getApiBaseUrl = () => {
    const env = getEnvironment();

    if (env === 'production') {
        return PRODUCTION_API_URL;
    }

    return getLocalApiUrl();
};

// Get the current API URL
const apiBaseUrl = getApiBaseUrl();
const currentEnv = getEnvironment();

// Log the API configuration in development
if (__DEV__) {
    console.log('=== API Configuration ===');
    console.log(`Environment: ${currentEnv}`);
    console.log(`API Base URL: ${apiBaseUrl}`);
    console.log('=========================');
}

// App Configuration
const config = {
    name: 'JobApp',
    version: '1.0.0',

    // Environment
    env: currentEnv,
    isDev: __DEV__,

    // API Configuration
    api: {
        baseUrl: apiBaseUrl,
        timeout: 30000,
    },

    // App Settings
    settings: {
        defaultLanguage: 'en',
        defaultCurrency: 'MYR',
        currencySymbol: 'RM',
        supportedLanguages: ['en', 'ms', 'zh', 'ta'],
        supportedCurrencies: ['MYR', 'USD', 'SGD'],
        // Default location: Kuala Lumpur, Malaysia
        defaultLocation: {
            latitude: 3.139003,
            longitude: 101.686855,
            city: 'Kuala Lumpur',
            country: 'Malaysia',
            address: 'Kuala Lumpur, Malaysia',
        },
        countryCode: 'MY',
    },


    // Feature Flags
    features: {
        socialLogin: true,
        biometricAuth: false,
        darkMode: true,
        notifications: true,
        analytics: false,
    },
};

export default config;
