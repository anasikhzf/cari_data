import React from 'react';
import { Clock, Download, Sun, Moon, Monitor } from 'lucide-react';

export default function Header({
  theme,
  setTheme,
  timeStr,
  onResetView,
  onInstallClick
}) {
  const toggleTheme = () => {
    if (theme === 'auto') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('auto');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#151c2c]/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div
          onClick={onResetView}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 100 100" className="w-6 h-6">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" strokeWidth="9" />
              <path
                d="M 66 32 A 26 26 0 1 0 66 68"
                fill="none"
                stroke="#ffffff"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle cx="66" cy="32" r="6" fill="#38bdf8" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
              CariData
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
              React
            </span>
          </div>
        </div>

        {/* Digital Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>{timeStr}</span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <button
            onClick={onInstallClick}
            title="Pasang Aplikasi ke Layar Utama"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Instal</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title="Ganti Tema Tampilan (Auto / Light / Dark)"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Monitor className="w-4 h-4 text-emerald-500" />
            )}
            <span className="hidden md:inline capitalize">{theme}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
