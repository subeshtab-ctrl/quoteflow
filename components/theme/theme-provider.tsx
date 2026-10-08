'use client';

import React from 'react';
import {
  ThemeCustomizationProvider,
  useThemeCustomization,
  ThemeMode,
  AccentColor,
  SidebarStyle,
  CardStyle,
  BorderRadius,
  Density,
} from '@/lib/theme/theme-customization-context';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeCustomizationProvider>{children}</ThemeCustomizationProvider>;
}

// Backward compatible useTheme hook
export function useTheme() {
  const custom = useThemeCustomization();
  return {
    theme: custom.theme,
    resolvedTheme: custom.resolvedTheme,
    setTheme: custom.setTheme,
    toggleTheme: custom.toggleTheme,
  };
}

export { useThemeCustomization };
export type { ThemeMode, AccentColor, SidebarStyle, CardStyle, BorderRadius, Density };
