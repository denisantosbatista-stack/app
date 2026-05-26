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
          DEFAULT: "#0A0A0A",
          surface: "#141414",
          elevated: "#1A1A1A",
        },
        gold: {
          DEFAULT: "#D4AF37",
          hover: "#E5C365",
          deep: "#C9A44A",
          soft: "#B8954A",
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
      boxShadow: {
        gold: "0 0 30px rgba(201,164,74,0.25)",
        'gold-lg': "0 0 60px rgba(201,164,74,0.35)",
        'gold-inset': "inset 0 0 30px rgba(201,164,74,0.15)",
        deep: "0 20px 60px rgba(0,0,0,0.6)",
      },
      backdropBlur: {
        xs: '2px',
      },
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(212,175,55,0.5)' },
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
