import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useThemeStore, useColors } from '../../store';

export default function AccountScreen() {
    const { user, logout } = useAuthStore();
    const { mode, isDark, setMode, toggleTheme } = useThemeStore();
    const colors = useColors();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const handleThemeChange = () => {
        Alert.alert(
            'Theme',
            'Choose your preferred theme',
            [
                { text: 'Light', onPress: () => setMode('light') },
                { text: 'Dark', onPress: () => setMode('dark') },
                { text: 'System', onPress: () => setMode('system') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const getThemeLabel = () => {
        if (mode === 'system') return 'System';
        if (mode === 'light') return 'Light';
        return 'Dark';
    };

    const styles = createStyles(colors, isDark);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                {/* Account Settings Sections */}
                <View style={styles.sectionsContainer}>
                    {/* Appearance */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Appearance</Text>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={handleThemeChange}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
                                <Text style={styles.settingTitle}>Theme</Text>
                            </View>
                            <View style={styles.settingRight}>
                                <Text style={styles.settingValue}>{getThemeLabel()}</Text>
                                <Text style={styles.settingArrow}>›</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingIcon}>🌓</Text>
                                <Text style={styles.settingTitle}>Dark Mode</Text>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    {/* Preferences */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Preferences</Text>

                        <SettingItem
                            icon="🌐"
                            title="Language"
                            value={user?.preferred_language?.toUpperCase() || 'EN'}
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="💰"
                            title="Currency"
                            value={user?.preferred_currency || 'USD'}
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🕐"
                            title="Timezone"
                            value={user?.timezone || 'UTC'}
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🔔"
                            title="Notifications"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Security */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Security</Text>

                        <SettingItem
                            icon="🔒"
                            title="Change Password"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="📱"
                            title="Two-Factor Authentication"
                            value={user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="📧"
                            title="Email Verification"
                            value={user?.email_verified ? '✓ Verified' : 'Not Verified'}
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Subscription */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Subscription</Text>

                        <SettingItem
                            icon="⭐"
                            title="Upgrade to Premium"
                            value=""
                            onPress={() => { }}
                            highlight
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="💳"
                            title="Payment Methods"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🧾"
                            title="Billing History"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Support */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Support</Text>

                        <SettingItem
                            icon="❓"
                            title="Help Center"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="💬"
                            title="Contact Support"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="📜"
                            title="Terms of Service"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🔐"
                            title="Privacy Policy"
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.sectionGroup}>
                        <SettingItem
                            icon="🚪"
                            title="Logout"
                            value=""
                            onPress={handleLogout}
                            destructive
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🗑️"
                            title="Delete Account"
                            value=""
                            onPress={() => {
                                Alert.alert(
                                    'Delete Account',
                                    'This action cannot be undone. Are you sure?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Delete', style: 'destructive', onPress: () => { } },
                                    ]
                                );
                            }}
                            destructive
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appVersion}>JobApp v1.0.0</Text>
                    <Text style={styles.appCopyright}>© 2024 JobApp. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Setting Item Component
function SettingItem({
    icon,
    title,
    value,
    onPress,
    highlight,
    destructive,
    colors,
    isDark,
}: {
    icon: string;
    title: string;
    value?: string;
    onPress: () => void;
    highlight?: boolean;
    destructive?: boolean;
    colors: any;
    isDark: boolean;
}) {
    return (
        <TouchableOpacity
            style={[
                {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: highlight ? colors.primary : colors.cardBorder,
                },
                highlight && { backgroundColor: colors.primaryLight },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: '500',
                        color: destructive ? colors.error : highlight ? colors.primary : colors.text,
                    }}
                >
                    {title}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {value ? <Text style={{ fontSize: 14, color: colors.textSecondary }}>{value}</Text> : null}
                <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    sectionsContainer: {
        paddingTop: 16,
    },
    sectionGroup: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionGroupTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIcon: {
        fontSize: 20,
    },
    settingTitle: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    settingArrow: {
        fontSize: 20,
        color: colors.textMuted,
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    appVersion: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 4,
    },
    appCopyright: {
        fontSize: 12,
        color: colors.textMuted,
    },
});
