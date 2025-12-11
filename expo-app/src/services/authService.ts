import api, { setAuthTokens, clearTokens } from './api';

// Types
export interface User {
    id: number;
    uuid: string;
    email: string;
    phone?: string;
    user_type: 'seeker' | 'employer' | 'admin';
    status: string;
    is_email_verified: boolean;
    preferred_language: string;
    preferred_currency: string;
    timezone: string;
    two_factor_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface SeekerProfile {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    intro_video_url?: string;
    headline?: string;
    bio?: string;
    city?: string;
    country?: string;
    availability_status: 'available' | 'busy' | 'not_available';
    hourly_rate_min?: number;
    hourly_rate_max?: number;
    rate_currency: string;
    overall_rating: number;
    total_jobs_completed: number;
    is_premium: boolean;
    is_verified: boolean;
    profile_completeness: number;
}

export interface EmployerProfile {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
    job_title?: string;
    department?: string;
    company?: number;
    company_name?: string;
    is_company_owner: boolean;
    can_post_jobs: boolean;
    can_hire: boolean;
    overall_rating: number;
    total_jobs_posted: number;
    is_premium: boolean;
    is_verified: boolean;
}

export interface Company {
    id: number;
    uuid: string;
    name: string;
    logo_url?: string;
    industry?: string;
    company_size?: string;
    is_verified: boolean;
}

export interface SocialAccount {
    id: number;
    provider: 'google' | 'facebook' | 'linkedin' | 'apple';
    avatar_url?: string;
    created_at: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface RegisterData {
    email: string;
    password: string;
    password2: string;
    user_type: 'seeker' | 'employer';
    phone?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface SocialAuthData {
    provider: 'google' | 'facebook' | 'linkedin' | 'apple';
    access_token: string;
    user_type?: 'seeker' | 'employer';
}

export interface RegisterResponse {
    user: User;
    tokens: AuthTokens;
    message: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user: {
        id: number;
        email: string;
        user_type: string;
    };
}

// Auth Service
export const authService = {
    /**
     * Register a new user
     */
    async register(data: RegisterData): Promise<RegisterResponse> {
        const response = await api.post<RegisterResponse>('/auth/register/', data);
        if (response.data.tokens) {
            await setAuthTokens(response.data.tokens.access, response.data.tokens.refresh);
        }
        return response.data;
    },

    /**
     * Login with email and password
     */
    async login(data: LoginData): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login/', data);
        if (response.data.access && response.data.refresh) {
            await setAuthTokens(response.data.access, response.data.refresh);
        }
        return response.data;
    },

    /**
     * Social authentication (Google, Facebook, LinkedIn)
     */
    async socialAuth(data: SocialAuthData): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/social/', data);
        if (response.data.access && response.data.refresh) {
            await setAuthTokens(response.data.access, response.data.refresh);
        }
        return response.data;
    },

    /**
     * Get current authenticated user
     */
    async me(): Promise<User> {
        const response = await api.get<User>('/auth/me/');
        return response.data;
    },

    /**
     * Update current user settings
     */
    async updateMe(data: Partial<User>): Promise<User> {
        const response = await api.put<User>('/auth/me/', data);
        return response.data;
    },

    /**
     * Logout current session
     */
    async logout(): Promise<void> {
        try {
            const response = await api.post('/auth/logout/');
        } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed, clearing local tokens');
        }
        await clearTokens();
    },

    /**
     * Change password for authenticated user
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const response = await api.post('/auth/password/change/', {
            old_password: currentPassword,
            new_password: newPassword,
            new_password2: newPassword,
        });
        return response.data;
    },

    /**
     * Request password reset email
     */
    async requestPasswordReset(email: string): Promise<{ message: string }> {
        const response = await api.post('/auth/password/reset/', { email });
        return response.data;
    },

    /**
     * Confirm password reset with token
     */
    async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
        const response = await api.post('/auth/password/reset/confirm/', {
            token,
            new_password: newPassword,
            new_password2: newPassword,
        });
        return response.data;
    },

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<{ message: string }> {
        const response = await api.get(`/auth/verify-email/?token=${token}`);
        return response.data;
    },

    /**
     * Resend verification email
     */
    async resendVerification(): Promise<{ message: string }> {
        const response = await api.post('/auth/resend-verification/');
        return response.data;
    },

    /**
     * Get connected social accounts
     */
    async getSocialAccounts(): Promise<SocialAccount[]> {
        const response = await api.get<SocialAccount[]>('/auth/social/accounts/');
        return response.data;
    },

    /**
     * Disconnect a social account
     */
    async disconnectSocialAccount(provider: string): Promise<{ message: string }> {
        const response = await api.delete(`/auth/social/disconnect/${provider}/`);
        return response.data;
    },
};

export default authService;
