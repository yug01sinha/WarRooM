/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        accent: "hsl(var(--accent))",
        destructive: "hsl(var(--destructive))",
      },
      fontFamily: {
        sans: "var(--app-font-sans)",
        mono: "var(--app-font-mono)",
      },
    },
  },
  plugins: [],
}