/** @type {import('tailwindcss').Config} */
// Colors read CSS variables set by <ThemeProvider> (src/lib/theme.tsx), so light/dark is a variable swap.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: v("ink"),
        soft: v("soft"),
        surface: v("surface"),
        primary: v("primary"),
        canvas: v("canvas"),
        line: v("line"),
        glass: "rgb(var(--glass) / 0.55)",
        "glass-strong": "rgb(var(--glass) / 0.78)",
        "glass-dark": "rgb(var(--glass-dark) / 0.62)",
        "glass-line": "rgb(var(--glass-line) / 0.7)",
      },
    },
  },
  plugins: [],
};
