import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    isDark: boolean;

    // Actions
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

// Colors for light and dark themes
export const lightColors = {
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    card: '#FFFFFF',
    cardBorder: '#E5E5E5',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#6366F1',
    primaryLight: '#E0E7FF',
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    border: '#E5E5E5',
    inputBackground: '#F9FAFB',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E5E5',
};

export const darkColors = {
    background: '#0A0A0A',
    backgroundSecondary: '#111111',
    card: '#1A1A1A',
    cardBorder: '#333333',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primary: '#6366F1',
    primaryLight: '#312E81',
    success: '#22C55E',
    successLight: '#14532D',
    warning: '#F59E0B',
    warningLight: '#78350F',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    border: '#333333',
    inputBackground: '#1A1A1A',
    tabBar: '#111111',
    tabBarBorder: '#222222',
};

export type ThemeColors = typeof lightColors;

const getSystemTheme = (): boolean => {
    return Appearance.getColorScheme() === 'dark';
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: 'system',
            isDark: getSystemTheme(),

            setMode: (mode: ThemeMode) => {
                let isDark: boolean;
                if (mode === 'system') {
                    isDark = getSystemTheme();
                } else {
                    isDark = mode === 'dark';
                }
                set({ mode, isDark });
            },

            toggleTheme: () => {
                const currentMode = get().mode;
                let newMode: ThemeMode;

                if (currentMode === 'system') {
                    newMode = getSystemTheme() ? 'light' : 'dark';
                } else if (currentMode === 'light') {
                    newMode = 'dark';
                } else {
                    newMode = 'light';
                }

                set({ mode: newMode, isDark: newMode === 'dark' });
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// Hook to get current colors
export const useColors = (): ThemeColors => {
    const { isDark } = useThemeStore();
    return isDark ? darkColors : lightColors;
};

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
        useThemeStore.setState({ isDark: colorScheme === 'dark' });
    }
});

export default useThemeStore;
