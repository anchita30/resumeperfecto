/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#F4EEE6",        // warm cream background
          pink: "#F6C9CE",
          pinkDark: "#E8A5AD",
          blue: "#B7D3E8",
          blueDark: "#8FB8D8",
          green: "#C6DABF",
          greenDark: "#A3C596",
          peach: "#F3D3B8",
          peachDark: "#EAB88C",
          lavender: "#D9CFEB",
          lavenderDark: "#C0AEDF",
          yellow: "#F5E3A8",
          text: "#5B4E44",
          textSoft: "#8A7B6E",
        },
      },
      borderRadius: {
        clay: "28px",
        "clay-sm": "18px",
        "clay-lg": "36px",
      },
      boxShadow: {
        // Puffy claymorphism: soft raised highlight + deep soft shadow
        clay: "8px 8px 16px rgba(150, 130, 110, 0.25), -8px -8px 16px rgba(255, 255, 255, 0.7)",
        "clay-inset": "inset 6px 6px 12px rgba(150, 130, 110, 0.2), inset -6px -6px 12px rgba(255, 255, 255, 0.6)",
        "clay-sm": "4px 4px 10px rgba(150, 130, 110, 0.22), -4px -4px 10px rgba(255, 255, 255, 0.65)",
        "clay-hover": "10px 10px 20px rgba(150, 130, 110, 0.3), -10px -10px 20px rgba(255, 255, 255, 0.75)",
      },
      fontFamily: {
        rounded: ["'Baloo 2'", "'Quicksand'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
