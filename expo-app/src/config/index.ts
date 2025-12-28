import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2 to access host machine
// For iOS simulator, localhost works fine
// For physical devices, use your machine's actual IP address (e.g., 192.168.x.x)
const DEV_MACHINE_IP = '192.168.1.100'; // CHANGE THIS to your computer's local IP if using physical device

const getApiBaseUrl = () => {
    // 1. If explicit environment variable is set/overridden, use it first
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. PRODUCTION: If not in development mode, use the live server
    if (!__DEV__) {
        return 'https://jobappdemo.pythonanywhere.com/api/v1';
    }

    // 3. DEVELOPMENT: Use local machine
    if (Platform.OS === 'android') {
        // Android emulator uses 10.0.2.2 to access host localhost
        return 'http://10.0.2.2:8000/api/v1';
    }

    if (Platform.OS === 'ios') {
        // iOS simulator can use localhost
        return 'http://localhost:8000/api/v1';
    }

    // Web or other
    return 'http://localhost:8000/api/v1';
};

// App Configuration
const config = {
    name: 'JobApp',
    version: '1.0.0',

    // API Configuration
    api: {
        baseUrl: process.env.EXPO_PUBLIC_API_URL || getApiBaseUrl(),
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
