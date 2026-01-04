import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, useThemeStore, useColors } from '../../store';
import authService from '../../services/authService';
import { useTranslation } from '../../hooks';

// Language options
const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'th', name: 'Thai', native: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
];

// Currency options
const CURRENCIES = [
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
];

// Timezone options
const TIMEZONES = [
    { code: 'Asia/Kuala_Lumpur', name: 'Kuala Lumpur', offset: 'UTC+8' },
    { code: 'Asia/Singapore', name: 'Singapore', offset: 'UTC+8' },
    { code: 'Asia/Jakarta', name: 'Jakarta', offset: 'UTC+7' },
    { code: 'Asia/Bangkok', name: 'Bangkok', offset: 'UTC+7' },
    { code: 'Asia/Ho_Chi_Minh', name: 'Ho Chi Minh City', offset: 'UTC+7' },
    { code: 'Asia/Manila', name: 'Manila', offset: 'UTC+8' },
    { code: 'Asia/Hong_Kong', name: 'Hong Kong', offset: 'UTC+8' },
    { code: 'Asia/Taipei', name: 'Taipei', offset: 'UTC+8' },
    { code: 'Asia/Shanghai', name: 'Shanghai', offset: 'UTC+8' },
    { code: 'Asia/Tokyo', name: 'Tokyo', offset: 'UTC+9' },
    { code: 'Asia/Seoul', name: 'Seoul', offset: 'UTC+9' },
    { code: 'Asia/Kolkata', name: 'Mumbai / Kolkata', offset: 'UTC+5:30' },
    { code: 'Asia/Dubai', name: 'Dubai', offset: 'UTC+4' },
    { code: 'Europe/London', name: 'London', offset: 'UTC+0' },
    { code: 'Europe/Paris', name: 'Paris', offset: 'UTC+1' },
    { code: 'Europe/Berlin', name: 'Berlin', offset: 'UTC+1' },
    { code: 'America/New_York', name: 'New York', offset: 'UTC-5' },
    { code: 'America/Los_Angeles', name: 'Los Angeles', offset: 'UTC-8' },
    { code: 'America/Chicago', name: 'Chicago', offset: 'UTC-6' },
    { code: 'Australia/Sydney', name: 'Sydney', offset: 'UTC+11' },
    { code: 'Australia/Melbourne', name: 'Melbourne', offset: 'UTC+11' },
    { code: 'Pacific/Auckland', name: 'Auckland', offset: 'UTC+13' },
    { code: 'UTC', name: 'UTC', offset: 'UTC+0' },
];

export default function AccountScreen() {
    const navigation = useNavigation<any>();
    const { user, logout, setUser } = useAuthStore();
    const { mode, isDark, setMode, toggleTheme } = useThemeStore();
    const colors = useColors();
    const { t } = useTranslation();
    const isSeeker = user?.user_type === 'seeker';

    // Modal states
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            t('auth.logout'),
            'Are you sure you want to logout?',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('auth.logout'),
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
            t('settings.appearance'),
            'Choose your preferred theme',
            [
                { text: t('settings.lightMode'), onPress: () => setMode('light') },
                { text: t('settings.darkMode'), onPress: () => setMode('dark') },
                { text: t('settings.systemDefault'), onPress: () => setMode('system') },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    const getThemeLabel = () => {
        if (mode === 'system') return t('settings.systemDefault');
        if (mode === 'light') return t('settings.lightMode');
        return t('settings.darkMode');
    };

    // Get display names for current values
    const getLanguageName = () => {
        const lang = LANGUAGES.find(l => l.code === user?.preferred_language);
        return lang?.name || user?.preferred_language?.toUpperCase() || 'English';
    };

    const getCurrencyName = () => {
        const currency = CURRENCIES.find(c => c.code === user?.preferred_currency);
        return currency ? `${currency.code} (${currency.symbol})` : user?.preferred_currency || 'USD';
    };

    const getTimezoneName = () => {
        const tz = TIMEZONES.find(t => t.code === user?.timezone);
        return tz ? `${tz.name} (${tz.offset})` : user?.timezone || 'UTC';
    };

    // Update preference handlers
    const updatePreference = async (field: string, value: string) => {
        if (!user) return;

        setUpdating(true);
        try {
            const updatedFields = await authService.updateMe({ [field]: value });
            // Merge updated fields with existing user to preserve user_type and other fields
            setUser({ ...user, ...updatedFields });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update preference');
        } finally {
            setUpdating(false);
        }
    };

    const handleLanguageSelect = (code: string) => {
        setLanguageModalVisible(false);
        updatePreference('preferred_language', code);
    };

    const handleCurrencySelect = (code: string) => {
        setCurrencyModalVisible(false);
        updatePreference('preferred_currency', code);
    };

    const handleTimezoneSelect = (code: string) => {
        setTimezoneModalVisible(false);
        updatePreference('timezone', code);
    };

    const styles = createStyles(colors, isDark);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{t('settings.account')}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                {/* Account Settings Sections */}
                <View style={styles.sectionsContainer}>
                    {/* Appearance */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>{t('settings.appearance')}</Text>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={handleThemeChange}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
                                <Text style={styles.settingTitle}>{t('settings.appearance')}</Text>
                            </View>
                            <View style={styles.settingRight}>
                                <Text style={styles.settingValue}>{getThemeLabel()}</Text>
                                <Text style={styles.settingArrow}>›</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingIcon}>🌓</Text>
                                <Text style={styles.settingTitle}>{t('settings.darkMode')}</Text>
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
                        <Text style={styles.sectionGroupTitle}>{t('settings.preferences')}</Text>

                        <SettingItem
                            icon="🌐"
                            title={t('settings.language')}
                            value={getLanguageName()}
                            onPress={() => setLanguageModalVisible(true)}
                            colors={colors}
                            isDark={isDark}
                            loading={updating}
                        />
                        <SettingItem
                            icon="💰"
                            title={t('settings.currency')}
                            value={getCurrencyName()}
                            onPress={() => setCurrencyModalVisible(true)}
                            colors={colors}
                            isDark={isDark}
                            loading={updating}
                        />
                        <SettingItem
                            icon="🕐"
                            title={t('settings.timezone')}
                            value={getTimezoneName()}
                            onPress={() => setTimezoneModalVisible(true)}
                            colors={colors}
                            isDark={isDark}
                            loading={updating}
                        />
                        <SettingItem
                            icon="🔔"
                            title={t('settings.notifications')}
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Security */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>{t('settings.security')}</Text>

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

                    {/* Wallet & Activity */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Wallet & Activity</Text>

                        <SettingItem
                            icon="👛"
                            title="My Wallet"
                            value="Points, Coins & Cash"
                            onPress={() => navigation.navigate('Wallet')}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="⭐"
                            title="My Ratings"
                            value="View reviews"
                            onPress={() => navigation.navigate('Ratings')}
                            colors={colors}
                            isDark={isDark}
                        />
                        {isSeeker && (
                            <>
                                <SettingItem
                                    icon="⏱️"
                                    title="Work History"
                                    value="Past sessions"
                                    onPress={() => navigation.navigate('WorkHistory')}
                                    colors={colors}
                                    isDark={isDark}
                                />
                                <SettingItem
                                    icon="⚠️"
                                    title="Penalties"
                                    value="View status"
                                    onPress={() => navigation.navigate('Penalties')}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </>
                        )}
                    </View>

                    {/* Subscription */}
                    <View style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>Subscription</Text>

                        <SettingItem
                            icon="💎"
                            title="Premium Plans"
                            value="Upgrade now"
                            onPress={() => navigation.navigate('Subscription')}
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
                        <Text style={styles.sectionGroupTitle}>{t('settings.help')}</Text>

                        <SettingItem
                            icon="❓"
                            title={t('settings.help')}
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="💬"
                            title={t('settings.contactUs')}
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="📜"
                            title={t('settings.termsOfService')}
                            value=""
                            onPress={() => { }}
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🔐"
                            title={t('settings.privacyPolicy')}
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
                            title={t('auth.logout')}
                            value=""
                            onPress={handleLogout}
                            destructive
                            colors={colors}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="🗑️"
                            title={t('common.delete') + ' Account'}
                            value=""
                            onPress={() => {
                                Alert.alert(
                                    t('common.delete') + ' Account',
                                    'This action cannot be undone. Are you sure?',
                                    [
                                        { text: t('common.cancel'), style: 'cancel' },
                                        { text: t('common.delete'), style: 'destructive', onPress: () => { } },
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

            {/* Language Selection Modal */}
            <SelectionModal
                visible={languageModalVisible}
                onClose={() => setLanguageModalVisible(false)}
                title={t('settings.selectLanguage')}
                data={LANGUAGES}
                selectedCode={user?.preferred_language || 'en'}
                onSelect={handleLanguageSelect}
                colors={colors}
                renderItem={(item, isSelected, colors) => (
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: isSelected ? colors.primary : colors.text }}>
                            {item.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                            {item.native}
                        </Text>
                    </View>
                )}
            />

            {/* Currency Selection Modal */}
            <SelectionModal
                visible={currencyModalVisible}
                onClose={() => setCurrencyModalVisible(false)}
                title={t('settings.selectCurrency')}
                data={CURRENCIES}
                selectedCode={user?.preferred_currency || 'USD'}
                onSelect={handleCurrencySelect}
                colors={colors}
                renderItem={(item, isSelected, colors) => (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.backgroundSecondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                {item.symbol}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '500', color: isSelected ? colors.primary : colors.text }}>
                                {item.code}
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                {item.name}
                            </Text>
                        </View>
                    </View>
                )}
            />

            {/* Timezone Selection Modal */}
            <SelectionModal
                visible={timezoneModalVisible}
                onClose={() => setTimezoneModalVisible(false)}
                title={t('settings.selectTimezone')}
                data={TIMEZONES}
                selectedCode={user?.timezone || 'UTC'}
                onSelect={handleTimezoneSelect}
                colors={colors}
                renderItem={(item, isSelected, colors) => (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: isSelected ? colors.primary : colors.text }}>
                            {item.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            {item.offset}
                        </Text>
                    </View>
                )}
            />
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
    loading,
}: {
    icon: string;
    title: string;
    value?: string;
    onPress: () => void;
    highlight?: boolean;
    destructive?: boolean;
    colors: any;
    isDark: boolean;
    loading?: boolean;
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
            disabled={loading}
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
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <>
                        {value ? <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={1}>{value}</Text> : null}
                        <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}

// Selection Modal Component
function SelectionModal<T extends { code: string }>({
    visible,
    onClose,
    title,
    data,
    selectedCode,
    onSelect,
    renderItem,
    colors,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    data: T[];
    selectedCode: string;
    onSelect: (code: string) => void;
    renderItem: (item: T, isSelected: boolean, colors: any) => React.ReactNode;
    colors: any;
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.code}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    renderItem={({ item }) => {
                        const isSelected = item.code === selectedCode;
                        return (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 20,
                                    paddingVertical: 14,
                                    backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                                }}
                                onPress={() => onSelect(item.code)}
                            >
                                {renderItem(item, isSelected, colors)}
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20 }} />
                    )}
                />
            </SafeAreaView>
        </Modal>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 100,
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
