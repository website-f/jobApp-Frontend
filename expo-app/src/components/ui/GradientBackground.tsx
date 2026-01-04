import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../store/themeStore';

interface GradientBackgroundProps {
    children: React.ReactNode;
    variant?: 'primary' | 'accent' | 'subtle' | 'dark';
    style?: ViewStyle;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
    children,
    variant = 'primary',
    style,
}) => {
    const colors = useColors();

    const getGradientColors = (): [string, string, ...string[]] => {
        switch (variant) {
            case 'primary':
                return [colors.gradientStart, colors.gradientEnd];
            case 'accent':
                return [colors.accentGradientStart, colors.accentGradientEnd];
            case 'subtle':
                return [colors.background, colors.surface];
            case 'dark':
                return ['#0F172A', '#1E293B'];
            default:
                return [colors.gradientStart, colors.gradientEnd];
        }
    };

    return (
        <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default GradientBackground;
