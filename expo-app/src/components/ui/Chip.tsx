import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, typography, spacing, borderRadius } from '../../store/themeStore';

interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    onRemove?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    variant?: 'default' | 'outlined' | 'filled';
    size?: 'sm' | 'md';
    disabled?: boolean;
    style?: ViewStyle;
}

const Chip: React.FC<ChipProps> = ({
    label,
    selected = false,
    onPress,
    onRemove,
    icon,
    variant = 'default',
    size = 'md',
    disabled = false,
    style,
}) => {
    const colors = useColors();

    const sizeStyles = {
        sm: {
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            fontSize: typography.fontSize.xs,
            iconSize: 14,
        },
        md: {
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            fontSize: typography.fontSize.sm,
            iconSize: 16,
        },
    };

    const currentSize = sizeStyles[size];

    const getBackgroundColor = () => {
        if (disabled) return colors.surfaceHover;
        if (selected) return colors.primary;
        switch (variant) {
            case 'filled':
                return colors.primaryLight;
            case 'outlined':
                return 'transparent';
            default:
                return colors.surfaceHover;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        if (selected) return '#fff';
        switch (variant) {
            case 'filled':
                return colors.primary;
            default:
                return colors.text;
        }
    };

    const getBorderColor = () => {
        if (selected) return colors.primary;
        if (variant === 'outlined') return colors.border;
        return 'transparent';
    };

    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    paddingVertical: currentSize.paddingVertical,
                    paddingHorizontal: currentSize.paddingHorizontal,
                },
                variant === 'outlined' && styles.outlined,
                style,
            ]}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={currentSize.iconSize}
                    color={getTextColor()}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    styles.label,
                    {
                        fontSize: currentSize.fontSize,
                        color: getTextColor(),
                    },
                ]}
            >
                {label}
            </Text>
            {onRemove && (
                <TouchableOpacity
                    onPress={onRemove}
                    disabled={disabled}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeButton}
                >
                    <Ionicons
                        name="close-circle"
                        size={currentSize.iconSize + 2}
                        color={selected ? 'rgba(255,255,255,0.8)' : colors.textMuted}
                    />
                </TouchableOpacity>
            )}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    outlined: {
        borderWidth: 1,
    },
    icon: {
        marginRight: spacing.xs,
    },
    label: {
        fontWeight: typography.fontWeight.medium as any,
    },
    removeButton: {
        marginLeft: spacing.xs,
    },
});

export default Chip;
