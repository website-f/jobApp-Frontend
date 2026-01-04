import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, typography, spacing } from '../../store/themeStore';
import Button from './Button';

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'folder-open-outline',
    title,
    description,
    actionLabel,
    onAction,
    style,
}) => {
    const colors = useColors();

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={icon} size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {description && (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                    {description}
                </Text>
            )}
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="primary"
                    size="md"
                    style={styles.actionButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold as any,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    description: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: typography.lineHeight.relaxed,
        maxWidth: 280,
    },
    actionButton: {
        marginTop: spacing.lg,
    },
});

export default EmptyState;
