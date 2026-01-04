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

// AI-themed color palette with modern gradients
export const lightColors = {
    // Backgrounds
    background: '#FAFBFC',
    backgroundSecondary: '#F0F4F8',
    backgroundTertiary: '#E8EEF4',

    // Cards & Surfaces
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardElevated: '#FFFFFF',

    // Text
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // AI Theme - Primary (Cyan/Teal gradient feel)
    primary: '#0EA5E9',
    primaryDark: '#0284C7',
    primaryLight: '#E0F2FE',
    primaryMuted: '#BAE6FD',

    // AI Accent (Purple/Violet for AI feel)
    accent: '#8B5CF6',
    accentDark: '#7C3AED',
    accentLight: '#EDE9FE',
    accentMuted: '#DDD6FE',

    // AI Gradient colors
    gradientStart: '#0EA5E9',
    gradientMiddle: '#6366F1',
    gradientEnd: '#8B5CF6',

    // Accent Gradient colors (for AI promo cards)
    accentGradientStart: '#8B5CF6',
    accentGradientEnd: '#6366F1',

    // Semantic colors
    success: '#10B981',
    successDark: '#059669',
    successLight: '#D1FAE5',

    warning: '#F59E0B',
    warningDark: '#D97706',
    warningLight: '#FEF3C7',

    error: '#EF4444',
    errorDark: '#DC2626',
    errorLight: '#FEE2E2',

    info: '#3B82F6',
    infoDark: '#2563EB',
    infoLight: '#DBEAFE',

    // UI Elements
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E2E8F0',

    // Input
    inputBackground: '#F8FAFC',
    inputBorder: '#CBD5E1',
    inputBorderFocus: '#0EA5E9',
    placeholder: '#94A3B8',

    // Tab Bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#0EA5E9',
    tabBarInactive: '#94A3B8',

    // Status
    online: '#10B981',
    offline: '#94A3B8',
    busy: '#F59E0B',

    // Shadows (for elevation)
    shadow: 'rgba(15, 23, 42, 0.08)',
    shadowMedium: 'rgba(15, 23, 42, 0.12)',
    shadowStrong: 'rgba(15, 23, 42, 0.16)',

    // Overlays
    overlay: 'rgba(15, 23, 42, 0.5)',
    overlayLight: 'rgba(15, 23, 42, 0.3)',

    // Skeleton loading
    skeleton: '#E2E8F0',
    skeletonHighlight: '#F1F5F9',

    // Rating/Stars
    star: '#FBBF24',
    starEmpty: '#E2E8F0',

    // Premium/Badge colors
    premium: '#F59E0B',
    premiumLight: '#FEF3C7',
    verified: '#10B981',
    verifiedLight: '#D1FAE5',
};

export const darkColors = {
    // Backgrounds
    background: '#0B1120',
    backgroundSecondary: '#111827',
    backgroundTertiary: '#1E293B',

    // Cards & Surfaces
    card: '#1E293B',
    cardBorder: '#334155',
    cardElevated: '#293548',

    // Text
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',

    // AI Theme - Primary (Cyan/Teal gradient feel)
    primary: '#22D3EE',
    primaryDark: '#0EA5E9',
    primaryLight: '#164E63',
    primaryMuted: '#0E7490',

    // AI Accent (Purple/Violet for AI feel)
    accent: '#A78BFA',
    accentDark: '#8B5CF6',
    accentLight: '#2E1065',
    accentMuted: '#4C1D95',

    // AI Gradient colors
    gradientStart: '#22D3EE',
    gradientMiddle: '#818CF8',
    gradientEnd: '#A78BFA',

    // Accent Gradient colors (for AI promo cards)
    accentGradientStart: '#A78BFA',
    accentGradientEnd: '#818CF8',

    // Semantic colors
    success: '#34D399',
    successDark: '#10B981',
    successLight: '#064E3B',

    warning: '#FBBF24',
    warningDark: '#F59E0B',
    warningLight: '#78350F',

    error: '#F87171',
    errorDark: '#EF4444',
    errorLight: '#7F1D1D',

    info: '#60A5FA',
    infoDark: '#3B82F6',
    infoLight: '#1E3A5F',

    // UI Elements
    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',

    // Input
    inputBackground: '#1E293B',
    inputBorder: '#475569',
    inputBorderFocus: '#22D3EE',
    placeholder: '#64748B',

    // Tab Bar
    tabBar: '#111827',
    tabBarBorder: '#1E293B',
    tabBarActive: '#22D3EE',
    tabBarInactive: '#64748B',

    // Status
    online: '#34D399',
    offline: '#64748B',
    busy: '#FBBF24',

    // Shadows (for elevation)
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',

    // Skeleton loading
    skeleton: '#334155',
    skeletonHighlight: '#475569',

    // Rating/Stars
    star: '#FBBF24',
    starEmpty: '#475569',

    // Premium/Badge colors
    premium: '#FBBF24',
    premiumLight: '#78350F',
    verified: '#34D399',
    verifiedLight: '#064E3B',
};

export type ThemeColors = typeof lightColors;

// Typography scale
export const typography = {
    // Font sizes
    fontSize: {
        xs: 11,
        sm: 13,
        base: 15,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 22,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },
    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
    // Font weights (as strings for React Native)
    fontWeight: {
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
    },
    // Letter spacing
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
    },
};

// Spacing scale (4px base)
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
};

// Border radius scale
export const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    base: 12,
    lg: 16,
    xl: 20,
    xxl: 22,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
};

// Shadow presets
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    }),
};

// Animation timing
export const animation = {
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
    },
    easing: {
        // These are common bezier curves names
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
    },
};

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

// Hook to get theme utilities
export const useTheme = () => {
    const colors = useColors();
    const { isDark, mode, setMode, toggleTheme } = useThemeStore();

    return {
        colors,
        isDark,
        mode,
        setMode,
        toggleTheme,
        typography,
        spacing,
        borderRadius,
        shadows,
        animation,
    };
};

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
        useThemeStore.setState({ isDark: colorScheme === 'dark' });
    }
});

export default useThemeStore;
