"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sun, Moon, Sparkles, Award } from 'lucide-react';

export default function Header() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="w-full bg-white dark:bg-[#121826] border-b-2 border-[#5cb836] shadow-sm py-2.5 px-4 md:px-8 flex items-center justify-between transition-colors duration-200 sticky top-0 z-50">
      {/* Identidad Institucional y Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-center bg-white p-0.5">
          <Image
            src="/logo.png"
            alt="EcoTuc Logo"
            width={44}
            height={44}
            className="object-contain w-full h-full"
            priority
          />
        </div>
        <div>
          <div className="flex items-baseline tracking-tight">
            <span className="text-2xl font-black text-[#154726] dark:text-[#5cb836]">ECO</span>
            <span className="text-2xl font-black text-[#5cb836] dark:text-emerald-300">TUC</span>
          </div>
          <p className="text-[11px] font-bold text-black dark:text-gray-200 -mt-0.5 hidden sm:block">
            Gestión Inteligente de Micro-basurales • San Miguel de Tucumán
          </p>
        </div>
      </div>

      {/* Controles y Selector de Tema */}
      <div className="flex items-center gap-2.5">
        {/* Botón Selector Modo Claro / Oscuro */}
        {mounted && (
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Activar Modo Claro" : "Activar Modo Oscuro"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-gray-200 dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-cardLight dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#154726]" />
                <span className="hidden sm:inline">Modo Oscuro</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
