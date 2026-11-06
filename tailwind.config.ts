import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Theme gradients (3-stop avatar & top bar)
    'from-blue-600', 'via-indigo-600', 'to-purple-600',
    'from-rose-500', 'via-pink-600', 'to-amber-500',
    'from-emerald-500', 'via-teal-600', 'to-cyan-600',
    'from-violet-600', 'via-purple-600', 'to-fuchsia-600',
    'from-amber-500', 'via-orange-500', 'to-red-500',
    'from-cyan-500', 'via-sky-600', 'to-blue-600',
    'from-teal-500', 'via-emerald-600', 'to-green-600',
    'from-pink-500', 'via-fuchsia-600', 'to-rose-600',
    'bg-gradient-to-r', 'bg-gradient-to-br',
    // Avatar drop shadows
    'shadow-indigo-500/30', 'shadow-rose-500/30', 'shadow-emerald-500/30',
    'shadow-purple-500/30', 'shadow-amber-500/30', 'shadow-sky-500/30',
    'shadow-teal-500/30', 'shadow-pink-500/30',
    // Card hover glows
    'hover:border-indigo-300/80', 'hover:shadow-indigo-500/10',
    'hover:border-rose-300/80', 'hover:shadow-rose-500/10',
    'hover:border-emerald-300/80', 'hover:shadow-emerald-500/10',
    'hover:border-purple-300/80', 'hover:shadow-purple-500/10',
    'hover:border-amber-300/80', 'hover:shadow-amber-500/10',
    'hover:border-sky-300/80', 'hover:shadow-sky-500/10',
    'hover:border-teal-300/80', 'hover:shadow-teal-500/10',
    'hover:border-pink-300/80', 'hover:shadow-pink-500/10',
    // Badges & texts
    'bg-indigo-50', 'text-indigo-700', 'border-indigo-200/80',
    'bg-rose-50', 'text-rose-700', 'border-rose-200/80',
    'bg-emerald-50', 'text-emerald-700', 'border-emerald-200/80',
    'bg-purple-50', 'text-purple-700', 'border-purple-200/80',
    'bg-amber-50', 'text-amber-800', 'border-amber-200/80',
    'bg-sky-50', 'text-sky-800', 'border-sky-200/80',
    'bg-teal-50', 'text-teal-800', 'border-teal-200/80',
    'bg-pink-50', 'text-pink-700', 'border-pink-200/80',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },

      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
