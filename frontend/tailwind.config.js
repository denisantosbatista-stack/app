/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        sans: ['Outfit', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#F4EFE6",
          surface: "#FFFFFF",
          elevated: "#FBF7EF",
          text: "#141414",
          muted: "#6B6B5C",
        },
        bone: {
          DEFAULT: "#F4EFE6",
          warm: "#EFE6D4",
        },
        gold: {
          DEFAULT: "#B8954A",
          hover: "#D4AF37",
          deep: "#8B6F2F",
          soft: "#D9C58A",
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
      boxShadow: {
        gold: "0 6px 24px rgba(184, 149, 74, 0.25)",
        'gold-lg': "0 12px 50px rgba(184, 149, 74, 0.35)",
        'gold-inset': "inset 0 0 30px rgba(184, 149, 74, 0.10)",
        soft: "0 4px 18px rgba(60, 50, 30, 0.08)",
        deep: "0 16px 48px rgba(60, 50, 30, 0.14)",
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        gradientMove: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(184,149,74,0.30)' },
          '50%': { boxShadow: '0 0 40px rgba(184,149,74,0.55)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        gradient: 'gradientMove 12s ease infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        pulseGold: 'pulseGold 3s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
