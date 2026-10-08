'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'purple' | 'blue' | 'emerald' | 'orange' | 'rose';
export type SidebarStyle = 'default' | 'compact' | 'floating';
export type CardStyle = 'soft' | 'sharp' | 'glass';
export type BorderRadius = 'small' | 'medium' | 'large';
export type Density = 'compact' | 'comfortable' | 'spacious';

export interface ThemeCustomizationState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  accentColor: AccentColor;
  sidebarStyle: SidebarStyle;
  isSidebarCollapsed: boolean;
  cardStyle: CardStyle;
  borderRadius: BorderRadius;
  density: Density;
  isAiModalOpen: boolean;
  isCommandPaletteOpen: boolean;
}

export interface ThemeCustomizationContextType extends ThemeCustomizationState {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentColor: (color: AccentColor) => void;
  setSidebarStyle: (style: SidebarStyle) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapse: () => void;
  setCardStyle: (style: CardStyle) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  setDensity: (density: Density) => void;
  setIsAiModalOpen: (open: boolean) => void;
  openAiModal: () => void;
  closeAiModal: () => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  resetToDefaults: () => void;
}

const ACCENT_COLOR_MAP: Record<AccentColor, { hex: string; rgb: string; name: string }> = {
  purple: { hex: '#6366f1', rgb: '99, 102, 241', name: 'QuoteFlow Purple' },
  blue: { hex: '#2563eb', rgb: '37, 99, 235', name: 'Ocean Blue' },
  emerald: { hex: '#059669', rgb: '5, 150, 105', name: 'Emerald Green' },
  orange: { hex: '#ea580c', rgb: '234, 88, 12', name: 'Sunset Orange' },
  rose: { hex: '#e11d48', rgb: '225, 29, 72', name: 'Rose Red' },
};

const BORDER_RADIUS_MAP: Record<BorderRadius, string> = {
  small: '0.5rem',    // 8px
  medium: '0.875rem', // 14px
  large: '1.25rem',   // 20px
};

const STORAGE_KEY = 'quoteflow-customization-v2';

const defaultState: Omit<ThemeCustomizationState, 'resolvedTheme' | 'isAiModalOpen' | 'isCommandPaletteOpen'> = {
  theme: 'light',
  accentColor: 'purple',
  sidebarStyle: 'default',
  isSidebarCollapsed: false,
  cardStyle: 'soft',
  borderRadius: 'medium',
  density: 'comfortable',
};

const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export function ThemeCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [accentColor, setAccentColorState] = useState<AccentColor>('purple');
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>('default');
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(false);
  const [cardStyle, setCardStyleState] = useState<CardStyle>('soft');
  const [borderRadius, setBorderRadiusState] = useState<BorderRadius>('medium');
  const [density, setDensityState] = useState<Density>('comfortable');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setThemeState(parsed.theme);
        if (parsed.accentColor) setAccentColorState(parsed.accentColor);
        if (parsed.sidebarStyle) setSidebarStyleState(parsed.sidebarStyle);
        if (typeof parsed.isSidebarCollapsed === 'boolean') setIsSidebarCollapsedState(parsed.isSidebarCollapsed);
        if (parsed.cardStyle) setCardStyleState(parsed.cardStyle);
        if (parsed.borderRadius) setBorderRadiusState(parsed.borderRadius);
        if (parsed.density) setDensityState(parsed.density);
      } else {
        // Fallback check legacy quoteflow-theme
        const legacyTheme = localStorage.getItem('quoteflow-theme') as ThemeMode | null;
        if (legacyTheme) setThemeState(legacyTheme);
      }
    } catch {
      // fallback to defaults
    }
    setMounted(true);
  }, []);

  // Keyboard shortcut for Command Palette (⌘K / Ctrl+K) and QuoteFlow AI (⌘J / Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAiModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply DOM attributes & CSS variables whenever properties change
  useEffect(() => {
    let resolved: 'light' | 'dark' = 'light';
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    } else {
      resolved = theme;
    }
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply CSS variables & data attributes
    const accent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.purple;
    root.style.setProperty('--brand-color', accent.hex);
    root.style.setProperty('--brand-rgb', accent.rgb);
    root.style.setProperty('--radius', BORDER_RADIUS_MAP[borderRadius] || '0.875rem');

    root.setAttribute('data-accent', accentColor);
    root.setAttribute('data-card-style', cardStyle);
    root.setAttribute('data-sidebar-style', sidebarStyle);
    root.setAttribute('data-density', density);

    // Save to localStorage
    if (mounted) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            theme,
            accentColor,
            sidebarStyle,
            isSidebarCollapsed,
            cardStyle,
            borderRadius,
            density,
          })
        );
        localStorage.setItem('quoteflow-theme', theme);
      } catch {
        // quota exceeded or private mode
      }
    }
  }, [theme, accentColor, sidebarStyle, isSidebarCollapsed, cardStyle, borderRadius, density, mounted]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
  };
  const setAccentColor = (c: AccentColor) => setAccentColorState(c);
  const setSidebarStyle = (s: SidebarStyle) => setSidebarStyleState(s);
  const setIsSidebarCollapsed = (c: boolean) => setIsSidebarCollapsedState(c);
  const toggleSidebarCollapse = () => setIsSidebarCollapsedState((prev) => !prev);
  const setCardStyle = (s: CardStyle) => setCardStyleState(s);
  const setBorderRadius = (r: BorderRadius) => setBorderRadiusState(r);
  const setDensity = (d: Density) => setDensityState(d);

  const openAiModal = () => setIsAiModalOpen(true);
  const closeAiModal = () => setIsAiModalOpen(false);
  const openCommandPalette = () => setIsCommandPaletteOpen(true);
  const closeCommandPalette = () => setIsCommandPaletteOpen(false);

  const resetToDefaults = () => {
    setThemeState(defaultState.theme);
    setAccentColorState(defaultState.accentColor);
    setSidebarStyleState(defaultState.sidebarStyle);
    setIsSidebarCollapsedState(defaultState.isSidebarCollapsed);
    setCardStyleState(defaultState.cardStyle);
    setBorderRadiusState(defaultState.borderRadius);
    setDensityState(defaultState.density);
  };

  return (
    <ThemeCustomizationContext.Provider
      value={{
        theme,
        resolvedTheme,
        accentColor,
        sidebarStyle,
        isSidebarCollapsed,
        cardStyle,
        borderRadius,
        density,
        isAiModalOpen,
        isCommandPaletteOpen,
        setTheme,
        toggleTheme,
        setAccentColor,
        setSidebarStyle,
        setIsSidebarCollapsed,
        toggleSidebarCollapse,
        setCardStyle,
        setBorderRadius,
        setDensity,
        setIsAiModalOpen,
        openAiModal,
        closeAiModal,
        setIsCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        resetToDefaults,
      }}
    >
      {children}
    </ThemeCustomizationContext.Provider>
  );
}

export function useThemeCustomization() {
  const context = useContext(ThemeCustomizationContext);
  if (!context) {
    throw new Error('useThemeCustomization must be used within a ThemeCustomizationProvider');
  }
  return context;
}

export { ACCENT_COLOR_MAP, BORDER_RADIUS_MAP };
