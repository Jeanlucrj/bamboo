'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('sentinela-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme: Theme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('sentinela-theme', nextTheme);
    applyTheme(nextTheme);
  }

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-xl border border-slate-700 bg-slate-900/60" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 transition-all hover:border-teal-500/50 hover:bg-slate-800 hover:text-teal-300 light:border-slate-300 light:bg-white light:text-slate-700 light:hover:border-teal-500"
      title={theme === 'dark' ? 'Mudar para Modo Dia (Claro)' : 'Mudar para Modo Noite (Escuro)'}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <span className="text-base" role="img" aria-label="Sol">☀️</span>
      ) : (
        <span className="text-base" role="img" aria-label="Lua">🌙</span>
      )}
    </button>
  );
}
