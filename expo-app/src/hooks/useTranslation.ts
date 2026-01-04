/**
 * Custom hook for using translations in components
 */
import { useCallback, useMemo } from 'react';
import { setLocale, t as translate, getLocale } from '../i18n';
import { useAuthStore } from '../store';

/**
 * Hook that provides translation function and responds to language changes
 */
export function useTranslation() {
    const { user } = useAuthStore();

    // Update locale when user's preferred language changes
    useMemo(() => {
        setLocale(user?.preferred_language || null);
    }, [user?.preferred_language]);

    // Translation function with interpolation support
    const t = useCallback((key: string, options?: Record<string, string | number>): string => {
        return translate(key, options);
    }, [user?.preferred_language]); // Depend on language to trigger re-render

    return {
        t,
        locale: getLocale(),
    };
}

export default useTranslation;
