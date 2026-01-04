import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useColors, typography, borderRadius, shadows } from '../../store/themeStore';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
    source?: string | null;
    name?: string;
    size?: AvatarSize;
    showBorder?: boolean;
    borderColor?: string;
    badge?: React.ReactNode;
    style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({
    source,
    name,
    size = 'md',
    showBorder = false,
    borderColor,
    badge,
    style,
}) => {
    const colors = useColors();

    const getSizeValue = () => {
        switch (size) {
            case 'xs':
                return 28;
            case 'sm':
                return 36;
            case 'md':
                return 48;
            case 'lg':
                return 64;
            case 'xl':
                return 80;
            case '2xl':
                return 100;
            default:
                return 48;
        }
    };

    const getFontSize = () => {
        switch (size) {
            case 'xs':
                return typography.fontSize.xs;
            case 'sm':
                return typography.fontSize.sm;
            case 'md':
                return typography.fontSize.lg;
            case 'lg':
                return typography.fontSize.xl;
            case 'xl':
                return typography.fontSize['2xl'];
            case '2xl':
                return typography.fontSize['3xl'];
            default:
                return typography.fontSize.lg;
        }
    };

    const getInitials = () => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const sizeValue = getSizeValue();

    const containerStyles: ViewStyle[] = [
        styles.container,
        {
            width: sizeValue,
            height: sizeValue,
            borderRadius: sizeValue / 2,
        },
        showBorder && {
            borderWidth: 3,
            borderColor: borderColor || colors.primary,
        },
        shadows.md,
        style,
    ];

    return (
        <View style={containerStyles}>
            {source ? (
                <Image
                    source={{ uri: source }}
                    style={[
                        styles.image,
                        {
                            width: sizeValue - (showBorder ? 6 : 0),
                            height: sizeValue - (showBorder ? 6 : 0),
                            borderRadius: (sizeValue - (showBorder ? 6 : 0)) / 2,
                        },
                    ]}
                />
            ) : (
                <View
                    style={[
                        styles.placeholder,
                        {
                            width: sizeValue - (showBorder ? 6 : 0),
                            height: sizeValue - (showBorder ? 6 : 0),
                            borderRadius: (sizeValue - (showBorder ? 6 : 0)) / 2,
                            backgroundColor: colors.primary,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.initials,
                            { fontSize: getFontSize(), color: '#FFFFFF' },
                        ]}
                    >
                        {getInitials()}
                    </Text>
                </View>
            )}
            {badge && <View style={styles.badge}>{badge}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    image: {
        resizeMode: 'cover',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        fontWeight: typography.fontWeight.bold,
    },
    badge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
    },
});

export default Avatar;
