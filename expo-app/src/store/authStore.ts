import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../services/authService';
import authService from '../services/authService';
import { getAccessToken, clearTokens } from '../services/api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            error: null,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            checkAuth: async () => {
                set({ isLoading: true });
                try {
                    const token = await getAccessToken();
                    if (token) {
                        const user = await authService.me();
                        set({ user, isAuthenticated: true, isLoading: false });
                    } else {
                        set({ user: null, isAuthenticated: false, isLoading: false });
                    }
                } catch (error) {
                    await clearTokens();
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await authService.logout();
                } catch (error) {
                    // Continue with logout even if API fails
                }
                set({ user: null, isAuthenticated: false, isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export default useAuthStore;
