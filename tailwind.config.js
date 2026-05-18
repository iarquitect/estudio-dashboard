/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta pastel inspirada en Federica Fragapane
        bloom: {
          paper:  "#fafaf7",     // fondo papel
          ink:    "#1c1c1c",     // texto principal
          mute:   "#7a756f",     // texto secundario
          line:   "#e8e4dd",     // bordes suaves
          blue:   "#a8c5e8",
          bluedk: "#5d8bb8",
          green:  "#a3c9a8",
          greendk:"#5a9760",
          orange: "#f0b896",
          orangedk:"#d97757",
          rose:   "#e8a8a8",
          rosedk: "#c46868",
          violet: "#c8b8e0",
          violetdk:"#8a6db8",
          amber:  "#f0d795",
          amberdk:"#b8902f",
          sage:   "#9aa89a",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        serif:   ["Spectral", "Georgia", "serif"],
        display: ["Spectral", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
