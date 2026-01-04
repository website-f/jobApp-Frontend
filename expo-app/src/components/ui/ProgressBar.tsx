import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, typography, spacing, borderRadius } from '../../store/themeStore';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error';
    animated?: boolean;
    style?: ViewStyle;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    label,
    showPercentage = true,
    size = 'md',
    variant = 'default',
    animated = true,
    style,
}) => {
    const colors = useColors();
    const animatedWidth = useRef(new Animated.Value(0)).current;

    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    const sizeMap = {
        sm: 4,
        md: 8,
        lg: 12,
    };

    const barHeight = sizeMap[size];

    useEffect(() => {
        if (animated) {
            Animated.spring(animatedWidth, {
                toValue: clampedProgress,
                useNativeDriver: false,
                tension: 50,
                friction: 10,
            }).start();
        } else {
            animatedWidth.setValue(clampedProgress);
        }
    }, [clampedProgress, animated]);

    const getBarColor = () => {
        switch (variant) {
            case 'success':
                return colors.success;
            case 'warning':
                return colors.warning;
            case 'error':
                return colors.error;
            default:
                return colors.primary;
        }
    };

    const width = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const renderProgressFill = () => {
        if (variant === 'gradient') {
            return (
                <Animated.View style={{ width, height: '100%' }}>
                    <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.fill, { borderRadius: barHeight / 2 }]}
                    />
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={[
                    styles.fill,
                    {
                        width,
                        backgroundColor: getBarColor(),
                        borderRadius: barHeight / 2,
                    },
                ]}
            />
        );
    };

    return (
        <View style={[styles.container, style]}>
            {(label || showPercentage) && (
                <View style={styles.labelRow}>
                    {label && (
                        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                    )}
                    {showPercentage && (
                        <Text style={[styles.percentage, { color: colors.textMuted }]}>
                            {Math.round(clampedProgress)}%
                        </Text>
                    )}
                </View>
            )}
            <View
                style={[
                    styles.track,
                    {
                        height: barHeight,
                        backgroundColor: colors.surfaceHover,
                        borderRadius: barHeight / 2,
                    },
                ]}
            >
                {renderProgressFill()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    percentage: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    track: {
        width: '100%',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
    },
});

export default ProgressBar;
