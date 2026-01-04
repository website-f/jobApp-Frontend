import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useColors, typography, borderRadius, shadows, spacing } from '../../store/themeStore';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    style,
    textStyle,
}) => {
    const colors = useColors();

    const getBackgroundColor = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'primary':
                return colors.primary;
            case 'secondary':
                return colors.accent;
            case 'outline':
            case 'ghost':
                return 'transparent';
            case 'danger':
                return colors.error;
            case 'success':
                return colors.success;
            default:
                return colors.primary;
        }
    };

    const getBorderColor = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'outline':
                return colors.primary;
            default:
                return 'transparent';
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        switch (variant) {
            case 'primary':
            case 'secondary':
            case 'danger':
            case 'success':
                return '#FFFFFF';
            case 'outline':
            case 'ghost':
                return colors.primary;
            default:
                return '#FFFFFF';
        }
    };

    const getSizeStyles = (): ViewStyle => {
        switch (size) {
            case 'sm':
                return { paddingVertical: 8, paddingHorizontal: 16 };
            case 'lg':
                return { paddingVertical: 16, paddingHorizontal: 28 };
            default:
                return { paddingVertical: 12, paddingHorizontal: 24 };
        }
    };

    const getFontSize = () => {
        switch (size) {
            case 'sm':
                return typography.fontSize.sm;
            case 'lg':
                return typography.fontSize.lg;
            default:
                return typography.fontSize.base;
        }
    };

    const buttonStyles: ViewStyle[] = [
        styles.button,
        getSizeStyles(),
        {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        fullWidth && styles.fullWidth,
        variant === 'primary' && !disabled && shadows.md,
        style,
    ];

    const textStyles: TextStyle[] = [
        styles.text,
        {
            color: getTextColor(),
            fontSize: getFontSize(),
        },
        textStyle,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={buttonStyles}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon && iconPosition === 'left' && (
                        <View style={styles.iconLeft}>{icon}</View>
                    )}
                    <Text style={textStyles}>{title}</Text>
                    {icon && iconPosition === 'right' && (
                        <View style={styles.iconRight}>{icon}</View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.base,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    fullWidth: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: typography.fontWeight.semibold,
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: spacing.sm,
    },
    iconRight: {
        marginLeft: spacing.sm,
    },
});

export default Button;
