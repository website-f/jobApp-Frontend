import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, typography, spacing, borderRadius } from '../../store/themeStore';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'gradient' | 'outlined';
    onPress?: () => void;
    style?: ViewStyle;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    variant = 'default',
    onPress,
    style,
}) => {
    const colors = useColors();

    const renderContent = () => (
        <View style={styles.content}>
            {icon && (
                <View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: variant === 'gradient'
                            ? 'rgba(255,255,255,0.2)'
                            : colors.primaryLight
                    }
                ]}>
                    <Ionicons
                        name={icon}
                        size={18}
                        color={variant === 'gradient' ? '#fff' : colors.primary}
                    />
                </View>
            )}
            <Text
                style={[
                    styles.value,
                    { color: variant === 'gradient' ? '#fff' : colors.text }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
            >
                {value}
            </Text>
            <Text
                style={[
                    styles.title,
                    { color: variant === 'gradient' ? 'rgba(255,255,255,0.8)' : colors.textMuted }
                ]}
                numberOfLines={1}
            >
                {title}
            </Text>
            {subtitle && (
                <Text style={[
                    styles.subtitle,
                    { color: variant === 'gradient' ? 'rgba(255,255,255,0.7)' : colors.textMuted }
                ]}>
                    {subtitle}
                </Text>
            )}
            {trend && (
                <View style={[
                    styles.trendContainer,
                    {
                        backgroundColor: trend.isPositive
                            ? (variant === 'gradient' ? 'rgba(255,255,255,0.2)' : colors.successLight)
                            : (variant === 'gradient' ? 'rgba(255,255,255,0.2)' : colors.errorLight)
                    }
                ]}>
                    <Ionicons
                        name={trend.isPositive ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={trend.isPositive
                            ? (variant === 'gradient' ? '#fff' : colors.success)
                            : (variant === 'gradient' ? '#fff' : colors.error)}
                    />
                    <Text style={[
                        styles.trendValue,
                        { color: trend.isPositive
                            ? (variant === 'gradient' ? '#fff' : colors.success)
                            : (variant === 'gradient' ? '#fff' : colors.error) }
                    ]}>
                        {trend.value}%
                    </Text>
                </View>
            )}
        </View>
    );

    const containerStyle = [
        styles.container,
        variant === 'outlined' && [styles.outlined, { borderColor: colors.border }],
        variant === 'default' && { backgroundColor: colors.surface },
        style,
    ];

    if (variant === 'gradient') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={!onPress}
                activeOpacity={onPress ? 0.8 : 1}
            >
                <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.container, styles.gradient, style]}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        minWidth: 0,
        overflow: 'hidden',
    },
    outlined: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    gradient: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
        textAlign: 'center',
    },
    title: {
        fontSize: 11,
        fontWeight: typography.fontWeight.medium as any,
        textAlign: 'center',
        marginTop: 2,
    },
    subtitle: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 2,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        marginTop: spacing.xs,
    },
    trendValue: {
        fontSize: 10,
        fontWeight: typography.fontWeight.medium as any,
        marginLeft: 2,
    },
});

export default StatCard;
