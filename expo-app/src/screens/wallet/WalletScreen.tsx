import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import walletService, { Wallet, WalletTransaction, CoinPackage, EarningsSummary } from '../../services/walletService';

type TabType = 'overview' | 'transactions' | 'earn' | 'shop';

export default function WalletScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
    const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [walletData, transactionsData, packagesData, earningsData] = await Promise.all([
                walletService.getWallet(),
                walletService.getTransactions(),
                walletService.getCoinPackages(),
                walletService.getEarningsSummary()
            ]);

            setWallet(walletData);
            setTransactions(transactionsData);
            setCoinPackages(packagesData);
            setEarnings(earningsData);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handlePurchaseCoins = async (packageId: number) => {
        Alert.alert(
            'Purchase Coins',
            'This will redirect you to the payment gateway. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const result = await walletService.purchaseCoinPackage(packageId);
                            if (result.payment_intent) {
                                Alert.alert('Success', 'Redirecting to payment...');
                                // In real app, open payment URL
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error?.response?.data?.error || 'Failed to initiate purchase');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!bankAccount.trim()) {
            Alert.alert('Error', 'Please enter your bank account number');
            return;
        }
        if (wallet && amount > wallet.cash_balance) {
            Alert.alert('Error', 'Insufficient balance');
            return;
        }

        setProcessing(true);
        try {
            await walletService.requestWithdrawal({
                amount,
                bank_name: 'User Bank', // TODO: Add bank name field to modal
                account_number: bankAccount,
                account_holder_name: 'Account Holder', // TODO: Add account holder name field
            });
            Alert.alert('Success', 'Withdrawal request submitted. You will be notified once processed.');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setBankAccount('');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to submit withdrawal');
        } finally {
            setProcessing(false);
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'earn': return 'arrow-down-circle';
            case 'spend': return 'arrow-up-circle';
            case 'purchase': return 'card';
            case 'withdrawal': return 'cash';
            case 'refund': return 'refresh-circle';
            case 'bonus': return 'gift';
            default: return 'swap-horizontal';
        }
    };

    const getTransactionColor = (type: string) => {
        return type === 'earn' || type === 'bonus' || type === 'refund'
            ? colors.success
            : colors.error;
    };

    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'overview', label: t('wallet.overview'), icon: 'wallet' },
        { key: 'transactions', label: t('wallet.transactions'), icon: 'list' },
        { key: 'earn', label: t('wallet.earnPoints'), icon: 'star' },
        { key: 'shop', label: t('wallet.shop'), icon: 'cart' },
    ];

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{
                    flex: 1,
                    fontSize: typography.fontSize.xl,
                    fontWeight: '700',
                    color: colors.text,
                    marginLeft: spacing.md
                }}>
                    {t('wallet.title')}
                </Text>
            </View>

            {/* Tabs */}
            <View style={{
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.card
            }}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.md,
                            alignItems: 'center',
                            borderBottomWidth: 2,
                            borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent'
                        }}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={20}
                            color={activeTab === tab.key ? colors.primary : colors.textMuted}
                        />
                        <Text style={{
                            fontSize: typography.fontSize.xs,
                            color: activeTab === tab.key ? colors.primary : colors.textMuted,
                            marginTop: 2
                        }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {/* Overview Tab */}
                {activeTab === 'overview' && wallet && (
                    <>
                        {/* Balance Cards */}
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.primary,
                                borderRadius: borderRadius.lg,
                                padding: spacing.md
                            }}>
                                <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.8)' }}>
                                    {t('wallet.coins')}
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.xxl, fontWeight: '700', color: '#fff' }}>
                                    {wallet.coins_balance}
                                </Text>
                                <Ionicons name="diamond" size={24} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', right: spacing.md, top: spacing.md }} />
                            </View>
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.warning,
                                borderRadius: borderRadius.lg,
                                padding: spacing.md
                            }}>
                                <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.8)' }}>
                                    {t('wallet.points')}
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.xxl, fontWeight: '700', color: '#fff' }}>
                                    {wallet.points_balance}
                                </Text>
                                <Ionicons name="star" size={24} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', right: spacing.md, top: spacing.md }} />
                            </View>
                        </View>

                        {/* Cash Balance */}
                        <View style={{
                            backgroundColor: colors.success,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                            marginBottom: spacing.lg
                        }}>
                            <Text style={{ fontSize: typography.fontSize.sm, color: 'rgba(255,255,255,0.8)' }}>
                                {t('wallet.cashBalance')}
                            </Text>
                            <Text style={{ fontSize: 36, fontWeight: '700', color: '#fff' }}>
                                RM {(Number(wallet.cash_balance) || 0).toFixed(2)}
                            </Text>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingHorizontal: spacing.lg,
                                    paddingVertical: spacing.sm,
                                    borderRadius: borderRadius.base,
                                    alignSelf: 'flex-start',
                                    marginTop: spacing.md
                                }}
                                onPress={() => setShowWithdrawModal(true)}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
                                    {t('wallet.withdraw')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Earnings Summary */}
                        {earnings && (
                            <View style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.lg,
                                borderWidth: 1,
                                borderColor: colors.cardBorder
                            }}>
                                <Text style={{
                                    fontSize: typography.fontSize.lg,
                                    fontWeight: '700',
                                    color: colors.text,
                                    marginBottom: spacing.md
                                }}>
                                    {t('wallet.earningsSummary')}
                                </Text>
                                <View style={{ gap: spacing.sm }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.textSecondary }}>{t('wallet.thisWeek')}</Text>
                                        <Text style={{ fontWeight: '600', color: colors.text }}>RM {(Number(earnings.this_week) || 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.textSecondary }}>{t('wallet.thisMonth')}</Text>
                                        <Text style={{ fontWeight: '600', color: colors.text }}>RM {(Number(earnings.this_month) || 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.textSecondary }}>{t('wallet.totalEarnings')}</Text>
                                        <Text style={{ fontWeight: '700', color: colors.success }}>RM {(Number(earnings.total) || 0).toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Stats */}
                        <View style={{
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                            borderWidth: 1,
                            borderColor: colors.cardBorder
                        }}>
                            <Text style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: '700',
                                color: colors.text,
                                marginBottom: spacing.md
                            }}>
                                Lifetime Stats
                            </Text>
                            <View style={{ gap: spacing.sm }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary }}>Total Coins Earned</Text>
                                    <Text style={{ fontWeight: '600', color: colors.text }}>{wallet.total_coins_earned}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary }}>Total Points Earned</Text>
                                    <Text style={{ fontWeight: '600', color: colors.text }}>{wallet.total_points_earned}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary }}>Total Cash Earned</Text>
                                    <Text style={{ fontWeight: '600', color: colors.success }}>RM {(Number(wallet.total_cash_earned) || 0).toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                    <>
                        {transactions.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                                <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
                                <Text style={{ fontSize: typography.fontSize.lg, color: colors.text, marginTop: spacing.md }}>
                                    No Transactions
                                </Text>
                                <Text style={{ color: colors.textSecondary }}>
                                    Your transaction history will appear here
                                </Text>
                            </View>
                        ) : (
                            transactions.map((tx) => (
                                <View
                                    key={tx.id}
                                    style={{
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.md,
                                        marginBottom: spacing.sm,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: colors.cardBorder
                                    }}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: `${getTransactionColor(tx.transaction_type)}20`,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: spacing.md
                                    }}>
                                        <Ionicons
                                            name={getTransactionIcon(tx.transaction_type) as any}
                                            size={20}
                                            color={getTransactionColor(tx.transaction_type)}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                            {tx.description}
                                        </Text>
                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                                            {new Date(tx.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{
                                            fontSize: typography.fontSize.base,
                                            fontWeight: '700',
                                            color: getTransactionColor(tx.transaction_type)
                                        }}>
                                            {tx.transaction_type === 'spend' || tx.transaction_type === 'withdrawal' ? '-' : '+'}
                                            {tx.amount} {tx.currency_type === 'coins' ? '🪙' : tx.currency_type === 'points' ? '⭐' : 'RM'}
                                        </Text>
                                        {tx.is_pending && (
                                            <Text style={{ fontSize: typography.fontSize.xs, color: colors.warning }}>
                                                Pending
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}

                {/* Earn Points Tab */}
                {activeTab === 'earn' && (
                    <>
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: spacing.md
                        }}>
                            {t('wallet.howToEarn')}
                        </Text>

                        {[
                            { action: 'Complete Profile', points: 50, icon: 'person' },
                            { action: 'First Job Application', points: 20, icon: 'document-text' },
                            { action: 'Get Hired', points: 100, icon: 'checkmark-circle' },
                            { action: 'Complete a Job', points: 50, icon: 'briefcase' },
                            { action: 'Get 5-Star Review', points: 30, icon: 'star' },
                            { action: 'Daily Login', points: 5, icon: 'calendar' },
                            { action: 'Refer a Friend', points: 200, icon: 'people' },
                        ].map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}
                            >
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: colors.primaryLight,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: spacing.md
                                }}>
                                    <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                        {item.action}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: colors.warningLight,
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: spacing.xs,
                                    borderRadius: borderRadius.base
                                }}>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.warning }}>
                                        +{item.points} ⭐
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Shop Tab */}
                {activeTab === 'shop' && (
                    <>
                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: spacing.md
                        }}>
                            {t('wallet.buyCoinPackages')}
                        </Text>

                        {coinPackages.map((pkg) => (
                            <View
                                key={pkg.id}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    marginBottom: spacing.md,
                                    borderWidth: pkg.is_popular ? 2 : 1,
                                    borderColor: pkg.is_popular ? colors.primary : colors.cardBorder,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {pkg.is_popular && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        backgroundColor: colors.primary,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.xs,
                                        borderBottomLeftRadius: borderRadius.base
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                                            POPULAR
                                        </Text>
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text }}>
                                            {pkg.name}
                                        </Text>
                                        <Text style={{ fontSize: typography.fontSize.base, color: colors.textSecondary }}>
                                            {pkg.coins_amount} coins
                                            {pkg.bonus_coins > 0 && (
                                                <Text style={{ color: colors.success }}> +{pkg.bonus_coins} bonus</Text>
                                            )}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.primary }}>
                                            {pkg.currency} {(Number(pkg.price) || 0).toFixed(2)}
                                        </Text>
                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: colors.primary,
                                                paddingHorizontal: spacing.lg,
                                                paddingVertical: spacing.sm,
                                                borderRadius: borderRadius.base,
                                                marginTop: spacing.sm
                                            }}
                                            onPress={() => handlePurchaseCoins(pkg.id)}
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: '600' }}>Buy</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}

                        <Text style={{
                            fontSize: typography.fontSize.lg,
                            fontWeight: '700',
                            color: colors.text,
                            marginTop: spacing.lg,
                            marginBottom: spacing.md
                        }}>
                            {t('wallet.spendCoins')}
                        </Text>

                        {[
                            { name: 'Boost Application', coins: 10, description: 'Get priority in employer inbox' },
                            { name: 'Featured Profile', coins: 50, description: '7 days of featured visibility' },
                            { name: 'Unlimited Applications', coins: 30, description: 'No daily limits for 7 days' },
                        ].map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderWidth: 1,
                                    borderColor: colors.cardBorder
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text }}>
                                        {item.name}
                                    </Text>
                                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                                        {item.description}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: colors.primaryLight,
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: spacing.sm,
                                        borderRadius: borderRadius.base
                                    }}
                                >
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        {item.coins} 🪙
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            {/* Withdraw Modal */}
            <Modal
                visible={showWithdrawModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWithdrawModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end'
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: borderRadius.xl,
                        borderTopRightRadius: borderRadius.xl,
                        padding: spacing.lg
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text }}>
                                {t('wallet.withdraw')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm }}>
                            Available Balance: RM {(Number(wallet?.cash_balance) || 0).toFixed(2)}
                        </Text>

                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text, marginBottom: spacing.xs }}>
                            Amount (RM)
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                fontSize: typography.fontSize.base,
                                color: colors.text,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                marginBottom: spacing.md
                            }}
                            value={withdrawAmount}
                            onChangeText={setWithdrawAmount}
                            keyboardType="decimal-pad"
                            placeholder="Enter amount"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text, marginBottom: spacing.xs }}>
                            Bank Account Number
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.base,
                                padding: spacing.md,
                                fontSize: typography.fontSize.base,
                                color: colors.text,
                                borderWidth: 1,
                                borderColor: colors.cardBorder,
                                marginBottom: spacing.lg
                            }}
                            value={bankAccount}
                            onChangeText={setBankAccount}
                            placeholder="Enter bank account number"
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary,
                                paddingVertical: spacing.md,
                                borderRadius: borderRadius.base,
                                alignItems: 'center'
                            }}
                            onPress={handleWithdraw}
                            disabled={processing}
                        >
                            {processing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: typography.fontSize.base }}>
                                    Request Withdrawal
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
