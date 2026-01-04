import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, spacing, typography, borderRadius } from '../../store';
import profileService, { SeekerAddress, CreateAddressData } from '../../services/profileService';
import {
    Card,
    Button,
    LoadingSpinner,
    EmptyState,
    SectionHeader,
    Badge,
} from '../../components/ui';

const ADDRESS_TYPES = [
    { value: 'home', label: 'Home', icon: 'home-outline' },
    { value: 'work', label: 'Work', icon: 'business-outline' },
    { value: 'other', label: 'Other', icon: 'location-outline' },
] as const;

export default function LocationScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const [isLoading, setIsLoading] = useState(true);
    const [addresses, setAddresses] = useState<SeekerAddress[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<SeekerAddress | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [form, setForm] = useState<CreateAddressData>({
        label: '',
        address_type: 'home',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        is_active: false,
    });

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setIsLoading(true);
        try {
            const data = await profileService.getAddresses();
            setAddresses(data || []);
        } catch (error: any) {
            console.error('Failed to load addresses:', error);
            Alert.alert('Error', 'Failed to load addresses');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            label: '',
            address_type: 'home',
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            country: '',
            postal_code: '',
            is_active: false,
        });
        setEditingAddress(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    const openEditModal = (address: SeekerAddress) => {
        setEditingAddress(address);
        setForm({
            label: address.label,
            address_type: address.address_type,
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || '',
            city: address.city,
            state: address.state || '',
            country: address.country,
            postal_code: address.postal_code || '',
            is_active: address.is_active,
        });
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!form.label || !form.address_line_1 || !form.city || !form.country) {
            Alert.alert('Missing Fields', 'Please fill Label, Address, City, and Country');
            return;
        }

        setIsSaving(true);
        try {
            if (editingAddress) {
                const updated = await profileService.updateAddress(editingAddress.id, form);
                setAddresses(addresses.map(a => a.id === editingAddress.id ? updated : a));
                Alert.alert('Success', 'Address updated');
            } else {
                const newAddr = await profileService.createAddress(form);
                setAddresses([...addresses, newAddr]);
                Alert.alert('Success', 'Address added');
            }
            setShowAddModal(false);
            resetForm();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to save address');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (address: SeekerAddress) => {
        Alert.alert(
            'Delete Address',
            `Are you sure you want to delete "${address.label}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await profileService.deleteAddress(address.id);
                            setAddresses(addresses.filter(a => a.id !== address.id));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete address');
                        }
                    },
                },
            ]
        );
    };

    const handleSetActive = async (address: SeekerAddress) => {
        if (address.is_active) return;

        try {
            await profileService.setActiveAddress(address.id);
            setAddresses(addresses.map(a => ({
                ...a,
                is_active: a.id === address.id,
            })));
        } catch (error) {
            Alert.alert('Error', 'Failed to set active address');
        }
    };

    const getAddressTypeIcon = (type: string) => {
        const found = ADDRESS_TYPES.find(t => t.value === type);
        return found?.icon || 'location-outline';
    };

    const formatAddress = (addr: SeekerAddress) => {
        return [addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.country, addr.postal_code]
            .filter(Boolean)
            .join(', ');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My Locations</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                        {addresses.length} address{addresses.length !== 1 ? 'es' : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={openAddModal} style={styles.addHeaderBtn}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Add Address Card */}
                <View style={styles.section}>
                    <Card variant="elevated">
                        <TouchableOpacity onPress={openAddModal} style={styles.addCard}>
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.addCardIcon}
                            >
                                <Ionicons name="add" size={24} color="#fff" />
                            </LinearGradient>
                            <View style={styles.addCardText}>
                                <Text style={[styles.addCardTitle, { color: colors.text }]}>Add New Address</Text>
                                <Text style={[styles.addCardSubtitle, { color: colors.textMuted }]}>
                                    Add your home, work, or other locations
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* Addresses List */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Saved Addresses"
                        icon="location"
                        subtitle={addresses.length > 0 ? 'Tap to set as active' : undefined}
                    />

                    {isLoading ? (
                        <Card variant="default" style={styles.loadingCard}>
                            <LoadingSpinner size="lg" />
                        </Card>
                    ) : addresses.length === 0 ? (
                        <Card variant="default">
                            <EmptyState
                                icon="location-outline"
                                title="No addresses yet"
                                description="Add your first address to help employers know your location"
                            />
                        </Card>
                    ) : (
                        <View style={styles.addressList}>
                            {addresses.map((address) => (
                                <Card
                                    key={address.id}
                                    variant={address.is_active ? 'outlined' : 'default'}
                                    style={[
                                        styles.addressCard,
                                        address.is_active && { borderColor: colors.primary, borderWidth: 2 }
                                    ]}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleSetActive(address)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.addressHeader}>
                                            <View style={[styles.addressIcon, { backgroundColor: colors.primaryLight }]}>
                                                <Ionicons
                                                    name={getAddressTypeIcon(address.address_type) as any}
                                                    size={20}
                                                    color={colors.primary}
                                                />
                                            </View>
                                            <View style={styles.addressInfo}>
                                                <View style={styles.addressTitleRow}>
                                                    <Text style={[styles.addressLabel, { color: colors.text }]}>
                                                        {address.label}
                                                    </Text>
                                                    {address.is_active && (
                                                        <Badge variant="success" size="sm">Active</Badge>
                                                    )}
                                                </View>
                                                <Text style={[styles.addressType, { color: colors.textMuted }]}>
                                                    {ADDRESS_TYPES.find(t => t.value === address.address_type)?.label || 'Other'}
                                                </Text>
                                            </View>
                                            <View style={styles.addressActions}>
                                                <TouchableOpacity
                                                    onPress={() => openEditModal(address)}
                                                    style={[styles.actionBtn, { backgroundColor: colors.surfaceHover }]}
                                                >
                                                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(address)}
                                                    style={[styles.actionBtn, { backgroundColor: colors.errorLight }]}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={[styles.addressFull, { color: colors.textMuted }]} numberOfLines={2}>
                                            {formatAddress(address)}
                                        </Text>
                                        {!address.is_active && (
                                            <Text style={[styles.tapHint, { color: colors.primary }]}>
                                                Tap to set as active
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </Card>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add/Edit Address Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <LinearGradient
                                colors={[colors.gradientStart, colors.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.modalIcon}
                            >
                                <Ionicons name="location" size={24} color="#fff" />
                            </LinearGradient>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    {editingAddress ? 'Edit Address' : 'Add Address'}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                    {editingAddress ? 'Update your address details' : 'Enter your new address'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => { setShowAddModal(false); resetForm(); }}
                                style={[styles.modalClose, { backgroundColor: colors.surfaceHover }]}
                            >
                                <Ionicons name="close" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>
                            {/* Label */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>
                                    Label <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={form.label}
                                        onChangeText={(t) => setForm({ ...form, label: t })}
                                        placeholder="e.g. My Home, Office"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.textInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* Address Type */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Address Type</Text>
                                <View style={styles.typeRow}>
                                    {ADDRESS_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => setForm({ ...form, address_type: type.value })}
                                            style={[
                                                styles.typeOption,
                                                {
                                                    backgroundColor: form.address_type === type.value
                                                        ? colors.primary
                                                        : colors.surfaceHover,
                                                    borderColor: form.address_type === type.value
                                                        ? colors.primary
                                                        : colors.border,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={type.icon as any}
                                                size={18}
                                                color={form.address_type === type.value ? '#fff' : colors.textMuted}
                                            />
                                            <Text
                                                style={[
                                                    styles.typeLabel,
                                                    { color: form.address_type === type.value ? '#fff' : colors.textMuted },
                                                ]}
                                            >
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Address Line 1 */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>
                                    Address Line 1 <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={form.address_line_1}
                                        onChangeText={(t) => setForm({ ...form, address_line_1: t })}
                                        placeholder="Street address, building name"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.textInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* Address Line 2 */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Address Line 2</Text>
                                <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                    <Ionicons name="business-outline" size={20} color={colors.textMuted} />
                                    <TextInput
                                        value={form.address_line_2}
                                        onChangeText={(t) => setForm({ ...form, address_line_2: t })}
                                        placeholder="Apartment, suite, unit (optional)"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.textInput, { color: colors.text }]}
                                    />
                                </View>
                            </View>

                            {/* City & State */}
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                                        City <Text style={{ color: colors.error }}>*</Text>
                                    </Text>
                                    <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <TextInput
                                            value={form.city}
                                            onChangeText={(t) => setForm({ ...form, city: t })}
                                            placeholder="City"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.textInput, { color: colors.text }]}
                                        />
                                    </View>
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>State</Text>
                                    <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <TextInput
                                            value={form.state}
                                            onChangeText={(t) => setForm({ ...form, state: t })}
                                            placeholder="State"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.textInput, { color: colors.text }]}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Country & Postal Code */}
                            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                                        Country <Text style={{ color: colors.error }}>*</Text>
                                    </Text>
                                    <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <TextInput
                                            value={form.country}
                                            onChangeText={(t) => setForm({ ...form, country: t })}
                                            placeholder="Country"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.textInput, { color: colors.text }]}
                                        />
                                    </View>
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Postal Code</Text>
                                    <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                                        <TextInput
                                            value={form.postal_code}
                                            onChangeText={(t) => setForm({ ...form, postal_code: t })}
                                            placeholder="Postal"
                                            placeholderTextColor={colors.placeholder}
                                            style={[styles.textInput, { color: colors.text }]}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Set as Active */}
                            <TouchableOpacity
                                onPress={() => setForm({ ...form, is_active: !form.is_active })}
                                style={[
                                    styles.activeToggle,
                                    {
                                        backgroundColor: form.is_active ? colors.successLight : colors.surfaceHover,
                                        borderColor: form.is_active ? colors.success : colors.border,
                                    }
                                ]}
                            >
                                <Ionicons
                                    name={form.is_active ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={24}
                                    color={form.is_active ? colors.success : colors.textMuted}
                                />
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                    <Text style={[styles.activeToggleTitle, { color: colors.text }]}>
                                        Set as Active Address
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                        This will be your primary location shown to employers
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Modal Actions */}
                        <View style={[styles.modalActions, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                            <TouchableOpacity
                                onPress={() => { setShowAddModal(false); resetForm(); }}
                                style={[styles.cancelBtn, { borderColor: colors.border }]}
                            >
                                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={{ flex: 2 }}>
                                <LinearGradient
                                    colors={[colors.gradientStart, colors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.saveBtn}
                                >
                                    {isSaving ? (
                                        <LoadingSpinner size="sm" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>
                                                {editingAddress ? 'Update' : 'Save'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    addHeaderBtn: {
        width: 40,
        alignItems: 'flex-end',
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    addCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    addCardText: {
        flex: 1,
    },
    addCardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    addCardSubtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    loadingCard: {
        paddingVertical: spacing.xxl,
    },
    addressList: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    addressCard: {
        marginBottom: 0,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    addressIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    addressInfo: {
        flex: 1,
    },
    addressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    addressLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
    },
    addressType: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    addressActions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressFull: {
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
    },
    tapHint: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        maxHeight: '90%',
        minHeight: 500,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    modalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold as any,
    },
    modalClose: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
        marginBottom: spacing.xs,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        minHeight: 48,
        gap: spacing.sm,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        paddingVertical: spacing.xs,
    },
    typeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.xs,
    },
    typeLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
    },
    activeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.lg,
    },
    activeToggleTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
});
