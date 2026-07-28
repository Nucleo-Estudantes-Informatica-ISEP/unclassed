const defaultTheme = require("tailwindcss/defaultTheme");
const tailwindcssAnimate = require("tailwindcss-animate");

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "#161a1e",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          dark: "#121517",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: "#ecfbff",
          100: "#d4f5ff",
          200: "#a8ecff",
          300: "#6adeff",
          400: "#27cdf5",
          500: "#1BB0D9",
          600: "#0e8db5",
          700: "#107193",
          800: "#145c78",
          900: "#154d65",
          950: "#083244",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "Poppins", ...defaultTheme.fontFamily.sans],
        poppins: ["Poppins", ...defaultTheme.fontFamily.sans],
      },
      maxHeight: {
        0: "0",
        xl: "36rem",
      },
      dropShadow: {
        "3xl": "4px 6px 4px",
        "4xl": "8px 10px 8px",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, hsl(var(--primary) / 0.18), transparent 55%), radial-gradient(circle at bottom right, hsl(var(--primary) / 0.12), transparent 60%)",
        "hero-grid":
          'linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-16px)" },
          "100%": { transform: "translateY(0px)" },
        },
        drift: {
          "0%": { transform: "translateX(0px) rotate(0deg)" },
          "50%": { transform: "translateX(10px) rotate(2deg)" },
          "100%": { transform: "translateX(0px) rotate(0deg)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(27,176,217,0.0)" },
          "50%": { boxShadow: "0 0 28px rgba(27,176,217,0.45)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        drift: "drift 10s ease-in-out infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
