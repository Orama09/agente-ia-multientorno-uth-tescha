/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-red-500",
    "bg-blue-500",
    "text-white",
    "p-10",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};