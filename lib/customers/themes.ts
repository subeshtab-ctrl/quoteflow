export interface CustomerTheme {
  gradient: string;
  avatarShadow: string;
  topBar: string;
  lightBg: string;
  accentText: string;
  quoteBadge: string;
  quoteBadgeBorder: string;
  hoverGlow: string;
  cssGradient: string;
  cssTopBar: string;
  accentColor: string;
  lightHex: string;
}

export const CUSTOMER_THEMES: CustomerTheme[] = [
  {
    // 0: Electric Indigo & Purple
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    avatarShadow: 'shadow-indigo-500/30',
    topBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600',
    lightBg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    quoteBadge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    quoteBadgeBorder: 'border-indigo-200/80 dark:border-indigo-800/60',
    hoverGlow: 'hover:border-indigo-300/80 hover:shadow-indigo-500/10',
    cssGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #9333ea 100%)',
    cssTopBar: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #9333ea 100%)',
    accentColor: '#4f46e5',
    lightHex: '#eef2ff',
  },
  {
    // 1: Sunset Coral & Rose
    gradient: 'from-rose-500 via-pink-600 to-amber-500',
    avatarShadow: 'shadow-rose-500/30',
    topBar: 'bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500',
    lightBg: 'bg-rose-50/70 dark:bg-rose-950/40',
    accentText: 'text-rose-600 dark:text-rose-400',
    quoteBadge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    quoteBadgeBorder: 'border-rose-200/80 dark:border-rose-800/60',
    hoverGlow: 'hover:border-rose-300/80 hover:shadow-rose-500/10',
    cssGradient: 'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #f59e0b 100%)',
    cssTopBar: 'linear-gradient(90deg, #f43f5e 0%, #db2777 50%, #f59e0b 100%)',
    accentColor: '#e11d48',
    lightHex: '#ffe4e6',
  },
  {
    // 2: Vivid Emerald & Teal
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    avatarShadow: 'shadow-emerald-500/30',
    topBar: 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600',
    lightBg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    quoteBadge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    quoteBadgeBorder: 'border-emerald-200/80 dark:border-emerald-800/60',
    hoverGlow: 'hover:border-emerald-300/80 hover:shadow-emerald-500/10',
    cssGradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 50%, #0891b2 100%)',
    cssTopBar: 'linear-gradient(90deg, #10b981 0%, #0d9488 50%, #0891b2 100%)',
    accentColor: '#059669',
    lightHex: '#ecfdf5',
  },
  {
    // 3: Deep Royal Violet & Fuchsia
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    avatarShadow: 'shadow-purple-500/30',
    topBar: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600',
    lightBg: 'bg-purple-50/70 dark:bg-purple-950/40',
    accentText: 'text-purple-600 dark:text-purple-400',
    quoteBadge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    quoteBadgeBorder: 'border-purple-200/80 dark:border-purple-800/60',
    hoverGlow: 'hover:border-purple-300/80 hover:shadow-purple-500/10',
    cssGradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)',
    cssTopBar: 'linear-gradient(90deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)',
    accentColor: '#7c3aed',
    lightHex: '#f5f3ff',
  },
  {
    // 4: Warm Amber & Tangerine
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    avatarShadow: 'shadow-amber-500/30',
    topBar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
    lightBg: 'bg-amber-50/70 dark:bg-amber-950/40',
    accentText: 'text-amber-600 dark:text-amber-400',
    quoteBadge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    quoteBadgeBorder: 'border-amber-200/80 dark:border-amber-800/60',
    hoverGlow: 'hover:border-amber-300/80 hover:shadow-amber-500/10',
    cssGradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
    cssTopBar: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
    accentColor: '#d97706',
    lightHex: '#fffbeb',
  },
  {
    // 5: Ocean Sky & Electric Blue
    gradient: 'from-cyan-500 via-sky-600 to-blue-600',
    avatarShadow: 'shadow-sky-500/30',
    topBar: 'bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-600',
    lightBg: 'bg-sky-50/70 dark:bg-sky-950/40',
    accentText: 'text-sky-600 dark:text-sky-400',
    quoteBadge: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    quoteBadgeBorder: 'border-sky-200/80 dark:border-sky-800/60',
    hoverGlow: 'hover:border-sky-300/80 hover:shadow-sky-500/10',
    cssGradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #2563eb 100%)',
    cssTopBar: 'linear-gradient(90deg, #06b6d4 0%, #0284c7 50%, #2563eb 100%)',
    accentColor: '#0284c7',
    lightHex: '#f0f9ff',
  },
  {
    // 6: Fresh Lime & Mint
    gradient: 'from-teal-500 via-emerald-600 to-green-600',
    avatarShadow: 'shadow-teal-500/30',
    topBar: 'bg-gradient-to-r from-teal-500 via-emerald-600 to-green-600',
    lightBg: 'bg-teal-50/70 dark:bg-teal-950/40',
    accentText: 'text-teal-600 dark:text-teal-400',
    quoteBadge: 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    quoteBadgeBorder: 'border-teal-200/80 dark:border-teal-800/60',
    hoverGlow: 'hover:border-teal-300/80 hover:shadow-teal-500/10',
    cssGradient: 'linear-gradient(135deg, #14b8a6 0%, #059669 50%, #16a34a 100%)',
    cssTopBar: 'linear-gradient(90deg, #14b8a6 0%, #059669 50%, #16a34a 100%)',
    accentColor: '#0d9488',
    lightHex: '#f0fdfa',
  },
  {
    // 7: Hot Pink & Neon Berry
    gradient: 'from-pink-500 via-fuchsia-600 to-rose-600',
    avatarShadow: 'shadow-pink-500/30',
    topBar: 'bg-gradient-to-r from-pink-500 via-fuchsia-600 to-rose-600',
    lightBg: 'bg-pink-50/70 dark:bg-pink-950/40',
    accentText: 'text-pink-600 dark:text-pink-400',
    quoteBadge: 'bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
    quoteBadgeBorder: 'border-pink-200/80 dark:border-pink-800/60',
    hoverGlow: 'hover:border-pink-300/80 hover:shadow-pink-500/10',
    cssGradient: 'linear-gradient(135deg, #ec4899 0%, #c026d3 50%, #e11d48 100%)',
    cssTopBar: 'linear-gradient(90deg, #ec4899 0%, #c026d3 50%, #e11d48 100%)',
    accentColor: '#db2777',
    lightHex: '#fdf2f8',
  },
];

export function getCustomerTheme(key: string): CustomerTheme {
  let hash = 0;
  const str = String(key || 'client');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CUSTOMER_THEMES.length;
  return CUSTOMER_THEMES[idx] || CUSTOMER_THEMES[0];
}

export function getCustomerInitials(name: string, company?: string | null): string {
  const clean = (name || company || '').trim();
  if (!clean) return 'CU';

  const parts = clean.split(/[\s_.-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstWord = parts[0].replace(/[^a-zA-Z0-9]/g, '');
    if (firstWord.toLowerCase() === 'the' && parts.length >= 2) {
      const secondWord = parts[1].replace(/[^a-zA-Z0-9]/g, '');
      if (secondWord) {
        return (firstWord[0] + secondWord[0]).toUpperCase();
      }
    }
    const lastWord = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, '');
    if (firstWord && lastWord) {
      return (firstWord[0] + lastWord[0]).toUpperCase();
    }
  }

  const lettersOnly = clean.replace(/[^a-zA-Z0-9]/g, '');
  if (lettersOnly.length >= 2) {
    if (/^[A-Z]{3,4}$/.test(lettersOnly)) {
      return (lettersOnly[0] + lettersOnly[lettersOnly.length - 1]).toUpperCase();
    }
    return lettersOnly.slice(0, 2).toUpperCase();
  }
  if (lettersOnly.length === 1) {
    return lettersOnly.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}
