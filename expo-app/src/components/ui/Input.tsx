import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TextInputProps,
    TouchableOpacity,
} from 'react-native';
import { useColors, typography, borderRadius, spacing } from '../../store/themeStore';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    variant?: 'default' | 'filled' | 'underlined';
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    containerStyle,
    inputStyle,
    variant = 'default',
    ...props
}) => {
    const colors = useColors();
    const [isFocused, setIsFocused] = useState(false);

    const getBorderColor = () => {
        if (error) return colors.error;
        if (isFocused) return colors.primary;
        return colors.inputBorder;
    };

    const getBackgroundColor = () => {
        switch (variant) {
            case 'filled':
                return colors.inputBackground;
            case 'underlined':
                return 'transparent';
            default:
                return colors.inputBackground;
        }
    };

    const getContainerStyles = (): ViewStyle => {
        const baseStyles: ViewStyle = {
            backgroundColor: getBackgroundColor(),
        };

        switch (variant) {
            case 'underlined':
                return {
                    ...baseStyles,
                    borderRadius: 0,
                    borderBottomWidth: 2,
                    borderBottomColor: getBorderColor(),
                };
            default:
                return {
                    ...baseStyles,
                    borderRadius: borderRadius.base,
                    borderWidth: 1.5,
                    borderColor: getBorderColor(),
                };
        }
    };

    return (
        <View style={[styles.wrapper, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: colors.text }]}>
                    {label}
                </Text>
            )}
            <View style={[styles.inputContainer, getContainerStyles()]}>
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        {
                            color: colors.text,
                            flex: 1,
                        },
                        leftIcon && { paddingLeft: 0 },
                        rightIcon && { paddingRight: 0 },
                        inputStyle,
                    ]}
                    placeholderTextColor={colors.placeholder}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
                {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
            </View>
            {error && (
                <Text style={[styles.error, { color: colors.error }]}>
                    {error}
                </Text>
            )}
            {hint && !error && (
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {hint}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.base,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        marginBottom: spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
    },
    input: {
        fontSize: typography.fontSize.base,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
    },
    leftIcon: {
        paddingLeft: spacing.base,
    },
    rightIcon: {
        paddingRight: spacing.base,
    },
    error: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
    hint: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
});

export default Input;
