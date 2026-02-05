/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        green: {
          50: '#f0f7f4',
          100: '#dcede4',
          200: '#bcdccc',
          300: '#90c4ab',
          400: '#5fa786',
          500: '#3d8c6a',
          600: '#2d6a4f',  // Primary brand color
          700: '#255541',
          800: '#204537',
          900: '#1c392e',
          950: '#0e2019',
        },
      },
    },
  },
  plugins: [],
}