import typography from "@tailwindcss/typography";
import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}", "./public/**/*.html"],
  darkMode: ["class", '[data-effective-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#fdf6e3",
          dark: "#073642",
        },
        accent: {
          DEFAULT: "#268bd2",
          dark: "#2aa198",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', ...fontFamily.sans],
        serif: ['"Source Serif 4"', ...fontFamily.serif],
        mono: ['"IBM Plex Mono"', ...fontFamily.mono],
      },
      keyframes: {
        "fade-scale": {
          "0%": { opacity: "0", transform: "scale(0.95)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "scale(1)", filter: "blur(0)" },
        },
        "word-slide-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(100%)",
            filter: "blur(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
            filter: "blur(0)",
          },
        },
      },
      animation: {
        "fade-scale": "fade-scale 0.4s cubic-bezier(0.43, 0.195, 0.02, 1) forwards",
        "word-slide-in": "word-slide-in 0.4s cubic-bezier(0.43, 0.195, 0.02, 1) forwards",
      },
      boxShadow: {
        header: "0 2px 8px rgba(15, 18, 25, 0.05)",
      },
    },
  },
  plugins: [typography],
};
