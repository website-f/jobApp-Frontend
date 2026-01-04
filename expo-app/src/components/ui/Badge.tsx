import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors, typography, borderRadius, spacing } from '../../store/themeStore';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'premium' | 'verified';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: BadgeSize;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'primary',
    size = 'md',
    icon,
    style,
}) => {
    const colors = useColors();

    const getColors = () => {
        switch (variant) {
            case 'primary':
                return { bg: colors.primaryLight, text: colors.primary };
            case 'secondary':
                return { bg: colors.accentLight, text: colors.accent };
            case 'success':
                return { bg: colors.successLight, text: colors.success };
            case 'warning':
                return { bg: colors.warningLight, text: colors.warning };
            case 'error':
                return { bg: colors.errorLight, text: colors.error };
            case 'info':
                return { bg: colors.infoLight, text: colors.info };
            case 'premium':
                return { bg: colors.premiumLight, text: colors.premium };
            case 'verified':
                return { bg: colors.verifiedLight, text: colors.verified };
            default:
                return { bg: colors.primaryLight, text: colors.primary };
        }
    };

    const getSizeStyles = (): ViewStyle => {
        switch (size) {
            case 'sm':
                return { paddingVertical: 2, paddingHorizontal: 6 };
            case 'lg':
                return { paddingVertical: 6, paddingHorizontal: 14 };
            default:
                return { paddingVertical: 4, paddingHorizontal: 10 };
        }
    };

    const getFontSize = () => {
        switch (size) {
            case 'sm':
                return typography.fontSize.xs;
            case 'lg':
                return typography.fontSize.sm;
            default:
                return typography.fontSize.xs;
        }
    };

    const { bg, text } = getColors();

    return (
        <View
            style={[
                styles.badge,
                getSizeStyles(),
                { backgroundColor: bg },
                style,
            ]}
        >
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text
                style={[
                    styles.label,
                    { color: text, fontSize: getFontSize() },
                ]}
            >
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
    },
    icon: {
        marginRight: spacing.xs,
    },
    label: {
        fontWeight: typography.fontWeight.semibold,
    },
});

export default Badge;
