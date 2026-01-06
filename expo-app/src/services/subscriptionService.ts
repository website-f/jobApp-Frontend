/**
 * Subscription Service - Premium subscriptions
 */
import api from './api';

export interface SubscriptionPlan {
    id: number;
    name: string;
    slug: string;
    user_type: 'seeker' | 'employer';
    user_type_display: string;
    price_monthly: number | string;
    price_yearly: number | string;
    currency: string;
    features: string[];
    features_list?: string[];  // Alternative field name from API
    max_applications_per_day?: number;
    max_applications_per_month?: number;
    max_job_posts_per_month?: number;
    priority_matching: boolean;
    verified_badge: boolean;
    ai_recommendations: boolean;
    analytics_access: boolean;
    background_check: boolean;
    featured_listing: boolean;
    bulk_messaging: boolean;
    ad_free: boolean;
    early_access: boolean;
    trial_days: number;
    description: string;
    is_popular: boolean;
    sort_order: number;
    is_active: boolean;
}

export interface Subscription {
    id: number;
    plan: number;
    plan_name: string;
    plan_details: SubscriptionPlan;
    status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';
    billing_cycle: 'monthly' | 'yearly';
    started_at: string;
    expires_at: string;
    trial_ends_at?: string;
    cancelled_at?: string;
    last_payment_at?: string;
    next_payment_at?: string;
    next_payment_amount?: number;
    applications_this_month: number;
    job_posts_this_month: number;
    cancel_at_period_end: boolean;
    is_active: boolean;
    is_trial: boolean;
    created_at: string;
}

export interface PaymentMethod {
    id: number;
    method_type: 'card' | 'fpx' | 'grabpay' | 'boost' | 'tng';
    last_four?: string;
    brand?: string;
    exp_month?: number;
    exp_year?: number;
    bank_name?: string;
    nickname?: string;
    is_default: boolean;
    is_verified: boolean;
    display_name: string;
    created_at: string;
}

export interface PaymentTransaction {
    id: number;
    subscription?: number;
    amount: number;
    currency: string;
    status: string;
    status_display: string;
    description: string;
    invoice_number?: string;
    invoice_url?: string;
    failure_message?: string;
    refunded_amount: number;
    created_at: string;
}

export interface SubscriptionLimits {
    can_apply: boolean;
    can_post_job: boolean;
    applications_remaining?: number;
    job_posts_remaining?: number;
    is_premium: boolean;
}

const subscriptionService = {
    // Get available plans
    async getPlans(userType?: string): Promise<SubscriptionPlan[]> {
        const params = userType ? { user_type: userType } : {};
        const response = await api.get('/subscriptions/plans/', { params });
        return response.data.results || response.data;
    },

    // Get all plans (for both user types)
    async getAllPlans(): Promise<SubscriptionPlan[]> {
        const response = await api.get('/subscriptions/plans/all/');
        return response.data.plans;
    },

    // Get current subscription
    async getCurrentSubscription(): Promise<{
        subscription: Subscription | null;
        is_premium: boolean;
    }> {
        const response = await api.get('/subscriptions/subscriptions/current/');
        return response.data;
    },

    // Subscribe to a plan
    async subscribe(planId: number, billingCycle: 'monthly' | 'yearly', paymentMethodId?: number): Promise<{
        success: boolean;
        subscription: Subscription;
        message: string;
    }> {
        const response = await api.post('/subscriptions/subscriptions/subscribe/', {
            plan_id: planId,
            billing_cycle: billingCycle,
            payment_method_id: paymentMethodId
        });
        return response.data;
    },

    // Cancel subscription
    async cancelSubscription(reason?: string, cancelImmediately?: boolean): Promise<{
        success: boolean;
        subscription: Subscription;
        message: string;
    }> {
        const response = await api.post('/subscriptions/subscriptions/cancel/', {
            reason,
            cancel_immediately: cancelImmediately
        });
        return response.data;
    },

    // Check subscription limits
    async checkLimits(): Promise<SubscriptionLimits> {
        const response = await api.get('/subscriptions/subscriptions/check_limit/');
        return response.data;
    },

    // Get payment methods
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        const response = await api.get('/subscriptions/payment-methods/');
        return response.data.results || response.data;
    },

    // Add payment method
    async addPaymentMethod(data: {
        method_type: string;
        stripe_payment_method_id?: string;
        bank_name?: string;
        nickname?: string;
        set_default?: boolean;
    }): Promise<{
        success: boolean;
        payment_method: PaymentMethod;
    }> {
        const response = await api.post('/subscriptions/payment-methods/', data);
        return response.data;
    },

    // Set default payment method
    async setDefaultPaymentMethod(methodId: number): Promise<{
        success: boolean;
        message: string;
    }> {
        const response = await api.post(`/subscriptions/payment-methods/${methodId}/set_default/`);
        return response.data;
    },

    // Delete payment method
    async deletePaymentMethod(methodId: number): Promise<void> {
        await api.delete(`/subscriptions/payment-methods/${methodId}/`);
    },

    // Get payment history
    async getPaymentHistory(): Promise<PaymentTransaction[]> {
        const response = await api.get('/subscriptions/transactions/');
        return response.data.results || response.data;
    }
};

export default subscriptionService;
