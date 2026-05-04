import { useEffect, useState } from 'react';

export type EntConnectTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'entconnect_theme';

function getStoredTheme(): EntConnectTheme {
    if (typeof window === 'undefined') return 'dark';

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
}

function applyTheme(theme: EntConnectTheme) {
    if (typeof document === 'undefined') return;

    const isDark = theme === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle('entconnect-dark', isDark);
    document.body.classList.toggle('entconnect-light', !isDark);
}

export function useTheme() {
    const [theme, setTheme] = useState<EntConnectTheme>(getStoredTheme);

    useEffect(() => {
        applyTheme(theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    };

    return {
        theme,
        isDarkTheme: theme === 'dark',
        toggleTheme,
    };
}
