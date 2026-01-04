import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors, typography, spacing } from '../../store/themeStore';

interface DividerProps {
    label?: string;
    style?: ViewStyle;
}

const Divider: React.FC<DividerProps> = ({ label, style }) => {
    const colors = useColors();

    if (label) {
        return (
            <View style={[styles.container, style]}>
                <View style={[styles.line, { backgroundColor: colors.divider }]} />
                <Text style={[styles.label, { color: colors.textMuted }]}>
                    {label}
                </Text>
                <View style={[styles.line, { backgroundColor: colors.divider }]} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.simpleLine,
                { backgroundColor: colors.divider },
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.base,
    },
    line: {
        flex: 1,
        height: 1,
    },
    label: {
        paddingHorizontal: spacing.base,
        fontSize: typography.fontSize.sm,
    },
    simpleLine: {
        height: 1,
        marginVertical: spacing.base,
    },
});

export default Divider;
