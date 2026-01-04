import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../store/themeStore';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    style?: ViewStyle;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color,
    style
}) => {
    const colors = useColors();
    const spinValue = useRef(new Animated.Value(0)).current;
    const pulseValue = useRef(new Animated.Value(0.3)).current;

    const sizeMap = {
        sm: 20,
        md: 32,
        lg: 48,
    };

    const spinnerSize = sizeMap[size];
    const spinnerColor = color || colors.primary;

    useEffect(() => {
        const spinAnimation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        );

        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 0.3,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        );

        spinAnimation.start();
        pulseAnimation.start();

        return () => {
            spinAnimation.stop();
            pulseAnimation.stop();
        };
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.container, style]}>
            <Animated.View
                style={[
                    styles.spinner,
                    {
                        width: spinnerSize,
                        height: spinnerSize,
                        borderRadius: spinnerSize / 2,
                        borderColor: spinnerColor,
                        borderTopColor: 'transparent',
                        transform: [{ rotate: spin }],
                        opacity: pulseValue,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinner: {
        borderWidth: 3,
    },
});

export default LoadingSpinner;
