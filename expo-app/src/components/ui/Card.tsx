import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useColors, borderRadius, shadows, spacing } from '../../store/themeStore';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onPress?: () => void;
    style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    onPress,
    style,
}) => {
    const colors = useColors();

    const getPaddingValue = () => {
        switch (padding) {
            case 'none':
                return 0;
            case 'sm':
                return spacing.md;
            case 'lg':
                return spacing.xl;
            default:
                return spacing.base;
        }
    };

    const getVariantStyles = (): ViewStyle => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.cardElevated,
                    borderWidth: 0,
                    ...shadows.lg,
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                };
            case 'glass':
                return {
                    backgroundColor: colors.card + 'E6', // 90% opacity
                    borderWidth: 1,
                    borderColor: colors.border + '40', // 25% opacity
                    ...shadows.md,
                };
            default:
                return {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    ...shadows.sm,
                };
        }
    };

    const cardStyles: ViewStyle[] = [
        styles.card,
        { padding: getPaddingValue() },
        getVariantStyles(),
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={cardStyles}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
});

export default Card;
