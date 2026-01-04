import React from 'react';
import { Text, StyleSheet, TextStyle, View } from 'react-native';
import { useColors, typography } from '../../store/themeStore';

interface GradientTextProps {
    children: string;
    size?: keyof typeof typography.fontSize;
    weight?: keyof typeof typography.fontWeight;
    style?: TextStyle;
}

// Note: True gradient text requires MaskedView + LinearGradient
// This is a simplified version that uses the primary color
// For full gradient effect, install expo-linear-gradient and @react-native-masked-view/masked-view
const GradientText: React.FC<GradientTextProps> = ({
    children,
    size = '2xl',
    weight = 'bold',
    style,
}) => {
    const colors = useColors();

    return (
        <Text
            style={[
                styles.text,
                {
                    color: colors.primary,
                    fontSize: typography.fontSize[size],
                    fontWeight: typography.fontWeight[weight],
                },
                style,
            ]}
        >
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    text: {
        // For now, we use a solid color
        // Add gradient effect when expo-linear-gradient is installed
    },
});

export default GradientText;
