/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        soft: "#6b7280",
        glass: "rgba(255,255,255,0.55)",
        "glass-strong": "rgba(255,255,255,0.78)",
        "glass-dark": "rgba(18,20,32,0.62)",
        "glass-line": "rgba(255,255,255,0.7)",
      },
    },
  },
  plugins: [],
};
