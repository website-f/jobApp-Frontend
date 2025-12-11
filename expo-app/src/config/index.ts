import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2 to access host machine
// For iOS simulator, localhost works fine
// For physical devices, use your machine's actual IP address
const getApiBaseUrl = () => {
    if (Platform.OS === 'android') {
        // Android emulator uses 10.0.2.2 to access host localhost
        return 'http://10.0.2.2:8000/api/v1';
    }
    // iOS simulator or web
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
        defaultCurrency: 'USD',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'ar'],
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD'],
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
