import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('caridata_theme') || 'auto');

  useEffect(() => {
    localStorage.setItem('caridata_theme', theme);
    const root = document.documentElement;

    const applyTheme = (isDark) => {
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const listener = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return [theme, setTheme];
}

export function useDigitalClock() {
  const [timeStr, setTimeStr] = useState('00:00:00');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeStr;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async (onSuccess) => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted' && onSuccess) {
        onSuccess();
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  return { showGuide, setShowGuide, triggerInstall };
}
