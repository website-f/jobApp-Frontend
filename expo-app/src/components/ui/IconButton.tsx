import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useColors, borderRadius, shadows, spacing } from '../../store/themeStore';

type IconButtonVariant = 'default' | 'filled' | 'ghost' | 'outlined';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
    icon: React.ReactNode;
    onPress: () => void;
    variant?: IconButtonVariant;
    size?: IconButtonSize;
    disabled?: boolean;
    color?: string;
    style?: ViewStyle;
}

const IconButton: React.FC<IconButtonProps> = ({
    icon,
    onPress,
    variant = 'default',
    size = 'md',
    disabled = false,
    color,
    style,
}) => {
    const colors = useColors();

    const getSizeValue = () => {
        switch (size) {
            case 'sm':
                return 32;
            case 'lg':
                return 52;
            default:
                return 44;
        }
    };

    const getVariantStyles = (): ViewStyle => {
        const baseColor = color || colors.primary;

        switch (variant) {
            case 'filled':
                return {
                    backgroundColor: baseColor,
                    ...shadows.sm,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: baseColor,
                };
            default:
                return {
                    backgroundColor: colors.backgroundSecondary,
                };
        }
    };

    const sizeValue = getSizeValue();

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                styles.button,
                {
                    width: sizeValue,
                    height: sizeValue,
                    borderRadius: sizeValue / 2,
                    opacity: disabled ? 0.5 : 1,
                },
                getVariantStyles(),
                style,
            ]}
        >
            {icon}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default IconButton;
