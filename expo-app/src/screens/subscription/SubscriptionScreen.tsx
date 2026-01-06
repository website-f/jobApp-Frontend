import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors, spacing, typography, borderRadius } from '../../store';
import { useTranslation } from '../../hooks';
import { useAuthStore } from '../../store';
import subscriptionService, { SubscriptionPlan, Subscription } from '../../services/subscriptionService';

export default function SubscriptionScreen() {
    const navigation = useNavigation();
    const colors = useColors();
    const { t } = useTranslation();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const fetchData = useCallback(async () => {
        try {
            const [plansData, subscriptionData] = await Promise.all([
                subscriptionService.getPlans(user?.user_type),
                subscriptionService.getCurrentSubscription()
            ]);
            setPlans(plansData);
            // getCurrentSubscription returns { subscription, is_premium } - extract subscription
            setCurrentSubscription(subscriptionData?.subscription || null);
        } catch (error) {
            console.error('Error fetching subscription data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.user_type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleSubscribe = async (planId: number) => {
        Alert.alert(
            'Subscribe',
            `Subscribe to this plan with ${billingCycle} billing?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Subscribe',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const result = await subscriptionService.subscribe(planId, billingCycle);
                            if (result.checkout_url) {
                                Alert.alert('Success', 'Redirecting to payment...');
                                // In real app, open payment URL
                            }
                            fetchData();
                        } catch (error: any) {
                            Alert.alert('Error', error?.response?.data?.error || 'Failed to subscribe');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleCancelSubscription = async () => {
        Alert.alert(
            'Cancel Subscription',
            'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.',
            [
                { text: 'Keep Subscription', style: 'cancel' },
                {
                    text: 'Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            await subscriptionService.cancelSubscription();
                            Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
                            fetchData();
                        } catch (error: any) {
                            Alert.alert('Error', error?.response?.data?.error || 'Failed to cancel subscription');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const getFeatureIcon = (feature: string): string => {
        if (feature.toLowerCase().includes('unlimited')) return 'infinite';
        if (feature.toLowerCase().includes('priority')) return 'rocket';
        if (feature.toLowerCase().includes('analytics')) return 'analytics';
        if (feature.toLowerCase().includes('support')) return 'headset';
        if (feature.toLowerCase().includes('badge')) return 'ribbon';
        if (feature.toLowerCase().includes('video')) return 'videocam';
        if (feature.toLowerCase().includes('boost')) return 'trending-up';
        return 'checkmark-circle';
    };

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
                    {t('premium.title')}
                </Text>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: spacing.base }}
            >
                {/* Current Subscription Status */}
                {currentSubscription && (
                    <View style={{
                        backgroundColor: colors.primaryLight,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                        borderWidth: 1,
                        borderColor: colors.primary
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Ionicons name="diamond" size={24} color={colors.primary} />
                            <Text style={{
                                fontSize: typography.fontSize.lg,
                                fontWeight: '700',
                                color: colors.primary,
                                marginLeft: spacing.sm
                            }}>
                                {currentSubscription.plan_name}
                            </Text>
                        </View>
                        <Text style={{ color: colors.text, marginBottom: spacing.xs }}>
                            {t('premium.status')}: <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                {currentSubscription.status || 'N/A'}
                            </Text>
                        </Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
                            {currentSubscription.status === 'active' && currentSubscription.expires_at ? (
                                `${t('premium.renewsOn').replace('{{date}}', new Date(currentSubscription.expires_at).toLocaleDateString())}`
                            ) : currentSubscription.status === 'cancelled' && currentSubscription.expires_at ? (
                                `${t('premium.accessUntil').replace('{{date}}', new Date(currentSubscription.expires_at).toLocaleDateString())}`
                            ) : currentSubscription.billing_cycle ? (
                                `${t('premium.billingCycle')}: ${currentSubscription.billing_cycle === 'monthly' ? t('premium.monthly') : t('premium.yearly')}`
                            ) : null}
                        </Text>
                        {currentSubscription.status === 'active' && (
                            <TouchableOpacity
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.error,
                                    paddingVertical: spacing.sm,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center'
                                }}
                                onPress={handleCancelSubscription}
                                disabled={processing}
                            >
                                <Text style={{ color: colors.error, fontWeight: '600' }}>
                                    Cancel Subscription
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Billing Cycle Toggle */}
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.xs,
                    marginBottom: spacing.lg
                }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            paddingVertical: spacing.md,
                            borderRadius: borderRadius.base,
                            backgroundColor: billingCycle === 'monthly' ? colors.primary : 'transparent',
                            alignItems: 'center'
                        }}
                        onPress={() => setBillingCycle('monthly')}
                    >
                        <Text style={{
                            fontWeight: '600',
                            color: billingCycle === 'monthly' ? '#fff' : colors.text
                        }}>
                            {t('premium.monthly')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            paddingVertical: spacing.md,
                            borderRadius: borderRadius.base,
                            backgroundColor: billingCycle === 'yearly' ? colors.primary : 'transparent',
                            alignItems: 'center'
                        }}
                        onPress={() => setBillingCycle('yearly')}
                    >
                        <Text style={{
                            fontWeight: '600',
                            color: billingCycle === 'yearly' ? '#fff' : colors.text
                        }}>
                            {t('premium.yearly')}
                        </Text>
                        <Text style={{
                            fontSize: typography.fontSize.xs,
                            color: billingCycle === 'yearly' ? 'rgba(255,255,255,0.8)' : colors.success
                        }}>
                            Save 20%
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Plans */}
                {plans.map((plan) => {
                    const isCurrentPlan = currentSubscription?.plan === plan.id;
                    const price = Number(billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly) || 0;

                    return (
                        <View
                            key={plan.id}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                                marginBottom: spacing.md,
                                borderWidth: plan.is_popular ? 2 : 1,
                                borderColor: plan.is_popular ? colors.primary : colors.cardBorder,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {plan.is_popular && (
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
                                        MOST POPULAR
                                    </Text>
                                </View>
                            )}

                            <Text style={{
                                fontSize: typography.fontSize.xl,
                                fontWeight: '700',
                                color: colors.text,
                                marginBottom: spacing.xs
                            }}>
                                {plan.name}
                            </Text>
                            <Text style={{
                                fontSize: typography.fontSize.sm,
                                color: colors.textSecondary,
                                marginBottom: spacing.md
                            }}>
                                {plan.description}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.lg }}>
                                <Text style={{
                                    fontSize: typography.fontSize.sm,
                                    color: colors.textSecondary
                                }}>
                                    {plan.currency}
                                </Text>
                                <Text style={{
                                    fontSize: 36,
                                    fontWeight: '700',
                                    color: colors.primary,
                                    marginHorizontal: spacing.xs
                                }}>
                                    {price.toFixed(2)}
                                </Text>
                                <Text style={{
                                    fontSize: typography.fontSize.sm,
                                    color: colors.textSecondary
                                }}>
                                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                                </Text>
                            </View>

                            {/* Features */}
                            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
                                {(plan.features_list || plan.features || []).map((feature, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons
                                            name={getFeatureIcon(feature) as any}
                                            size={18}
                                            color={colors.success}
                                        />
                                        <Text style={{
                                            marginLeft: spacing.sm,
                                            color: colors.text,
                                            flex: 1
                                        }}>
                                            {feature}
                                        </Text>
                                    </View>
                                ))}

                                {/* Show limits */}
                                {plan.max_applications_per_day && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="document-text" size={18} color={colors.success} />
                                        <Text style={{ marginLeft: spacing.sm, color: colors.text }}>
                                            {plan.max_applications_per_day === -1 ? 'Unlimited' : plan.max_applications_per_day} applications/day
                                        </Text>
                                    </View>
                                )}
                                {plan.max_job_posts_per_month && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="briefcase" size={18} color={colors.success} />
                                        <Text style={{ marginLeft: spacing.sm, color: colors.text }}>
                                            {plan.max_job_posts_per_month === -1 ? 'Unlimited' : plan.max_job_posts_per_month} job posts/month
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {isCurrentPlan ? (
                                <View style={{
                                    backgroundColor: colors.successLight,
                                    paddingVertical: spacing.md,
                                    borderRadius: borderRadius.base,
                                    alignItems: 'center'
                                }}>
                                    <Text style={{ color: colors.success, fontWeight: '700' }}>
                                        {t('premium.currentPlan')}
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: plan.is_popular ? colors.primary : colors.primaryLight,
                                        paddingVertical: spacing.md,
                                        borderRadius: borderRadius.base,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => handleSubscribe(plan.id)}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color={plan.is_popular ? '#fff' : colors.primary} />
                                    ) : (
                                        <Text style={{
                                            color: plan.is_popular ? '#fff' : colors.primary,
                                            fontWeight: '700',
                                            fontSize: typography.fontSize.base
                                        }}>
                                            {price === 0 ? t('premium.getStarted') : t('premium.subscribe')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {/* FAQ Section */}
                <View style={{ marginTop: spacing.lg }}>
                    <Text style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: '700',
                        color: colors.text,
                        marginBottom: spacing.md
                    }}>
                        Frequently Asked Questions
                    </Text>

                    {[
                        {
                            q: 'Can I cancel anytime?',
                            a: 'Yes, you can cancel your subscription at any time. You will retain access until the end of your billing period.'
                        },
                        {
                            q: 'How do refunds work?',
                            a: 'We offer a 7-day money-back guarantee for first-time subscribers.'
                        },
                        {
                            q: 'Can I switch plans?',
                            a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.'
                        }
                    ].map((faq, index) => (
                        <View
                            key={index}
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                borderWidth: 1,
                                borderColor: colors.cardBorder
                            }}
                        >
                            <Text style={{
                                fontSize: typography.fontSize.base,
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: spacing.xs
                            }}>
                                {faq.q}
                            </Text>
                            <Text style={{ color: colors.textSecondary }}>
                                {faq.a}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
