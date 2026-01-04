import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, typography, spacing } from '../../store/themeStore';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    subtitle,
    actionLabel,
    onAction,
    icon,
    style,
}) => {
    const colors = useColors();

    return (
        <View style={[styles.container, style]}>
            <View style={styles.leftContent}>
                {icon && (
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name={icon} size={18} color={colors.primary} />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
            {actionLabel && onAction && (
                <TouchableOpacity onPress={onAction} style={styles.actionButton}>
                    <Text style={[styles.actionLabel, { color: colors.primary }]}>
                        {actionLabel}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold as any,
    },
    subtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    actionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
        marginRight: 2,
    },
});

export default SectionHeader;
