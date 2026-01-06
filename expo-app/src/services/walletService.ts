/**
 * Wallet Service - Points, coins, and earnings
 */
import api from './api';

export interface Wallet {
    id: number;
    coins_balance: number;
    points_balance: number;
    cash_balance: number;
    pending_cash: number;
    total_coins_earned: number;
    total_points_earned: number;
    total_cash_earned: number;
    total_coins_spent: number;
    total_cash_withdrawn: number;
    currency: string;
    is_active: boolean;
    is_frozen: boolean;
    created_at: string;
}

export interface WalletTransaction {
    id: number;
    transaction_type: string;
    transaction_type_display: string;
    currency_type: 'coins' | 'points' | 'cash';
    amount: number;
    balance_after: number;
    source: string;
    source_display: string;
    reference_id?: string;
    reference_type?: string;
    description?: string;
    is_pending: boolean;
    pending_until?: string;
    confirmed_at?: string;
    created_at: string;
}

export interface PointsRule {
    id: number;
    action: string;
    points_awarded: number;
    coins_awarded: number;
    description: string;
    max_per_day?: number;
    max_per_user?: number;
    min_profile_completion: number;
    is_active: boolean;
}

export interface CoinPackage {
    id: number;
    name: string;
    coins_amount: number;
    bonus_coins: number;
    total_coins: number;
    price: number;
    currency: string;
    is_popular: boolean;
    discount_percent: number;
    is_active: boolean;
    sort_order: number;
}

export interface Withdrawal {
    id: number;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    status_display: string;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    transaction_reference?: string;
    processed_at?: string;
    failure_reason?: string;
    processing_fee: number;
    net_amount: number;
    notes?: string;
    created_at: string;
}

export interface EarningsSummary {
    total_earned: number;
    pending_earnings: number;
    this_week: number;
    this_month: number;
    last_month: number;
    total: number;
    by_job_type: { [key: string]: number };
}

const walletService = {
    // Get wallet
    async getWallet(): Promise<Wallet> {
        const response = await api.get('/wallet/wallet/');
        return response.data.wallet;
    },

    // Get transactions
    async getTransactions(type?: string, limit?: number): Promise<WalletTransaction[]> {
        const params: any = {};
        if (type) params.type = type;
        if (limit) params.limit = limit;

        const response = await api.get('/wallet/wallet/transactions/', { params });
        return response.data.transactions;
    },

    // Get earnings summary
    async getEarningsSummary(): Promise<EarningsSummary> {
        const response = await api.get('/wallet/wallet/earnings/');
        return response.data.earnings;
    },

    // Spend coins
    async spendCoins(amount: number, feature: string, referenceId?: string): Promise<{
        success: boolean;
        transaction: WalletTransaction;
        new_balance: number;
    }> {
        const response = await api.post('/wallet/wallet/spend_coins/', {
            amount,
            feature,
            reference_id: referenceId
        });
        return response.data;
    },

    // Get points rules
    async getPointsRules(): Promise<PointsRule[]> {
        const response = await api.get('/wallet/points-rules/');
        return response.data.results || response.data;
    },

    // Get coin packages
    async getCoinPackages(): Promise<CoinPackage[]> {
        const response = await api.get('/wallet/coin-packages/');
        return response.data.results || response.data;
    },

    // Purchase coin package
    async purchaseCoinPackage(packageId: number): Promise<{
        package: CoinPackage;
        payment_intent: any;
        message: string;
    }> {
        const response = await api.post(`/wallet/coin-packages/${packageId}/purchase/`);
        return response.data;
    },

    // Get withdrawals
    async getWithdrawals(): Promise<Withdrawal[]> {
        const response = await api.get('/wallet/withdrawals/');
        return response.data.results || response.data;
    },

    // Request withdrawal
    async requestWithdrawal(data: {
        amount: number;
        bank_name: string;
        account_number: string;
        account_holder_name: string;
    }): Promise<{
        success: boolean;
        withdrawal: Withdrawal;
        message: string;
    }> {
        const response = await api.post('/wallet/withdrawals/', data);
        return response.data;
    },

    // Cancel withdrawal
    async cancelWithdrawal(withdrawalId: number): Promise<{
        success: boolean;
        message: string;
    }> {
        const response = await api.post(`/wallet/withdrawals/${withdrawalId}/cancel/`);
        return response.data;
    }
};

export default walletService;
