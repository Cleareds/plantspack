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
        // Botanical Editorial - Surfaces
        surface: '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eef4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dfe9fa',
        'surface-container-highest': '#d9e3f4',
        // Primary
        primary: '#006b2c',
        'primary-container': '#00873a',
        // Secondary
        secondary: '#9d4300',
        'secondary-container': '#fd761a',
        // Tertiary
        tertiary: '#486347',
        'tertiary-container': '#607c5e',
        // Text
        'on-surface': '#121c28',
        'on-surface-variant': '#3e4a3d',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        // Outline
        outline: '#6e7b6c',
        'outline-variant': '#bdcaba',
        // Error
        error: '#ba1a1a',
        'on-error': '#ffffff',
        // Inverse
        'inverse-surface': '#27313e',
        'inverse-on-surface': '#eaf1ff',
        // Keep old green palette temporarily
        green: {
          50: '#f0f7f4',
          100: '#dcede4',
          200: '#bcdccc',
          300: '#90c4ab',
          400: '#5fa786',
          500: '#3d8c6a',
          600: '#2d6a4f',
          700: '#255541',
          800: '#204537',
          900: '#1c392e',
          950: '#0e2019',
        },
      },
      fontFamily: {
        'headline': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        'body': ['var(--font-manrope)', 'Manrope', 'sans-serif'],
        'label': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'ambient': '0 10px 30px rgba(18, 28, 40, 0.06)',
        'ambient-lg': '0 20px 40px rgba(18, 28, 40, 0.08)',
        'editorial': '0 32px 64px -16px rgba(0, 107, 44, 0.12)',
      },
      letterSpacing: {
        'editorial': '-0.02em',
        'label': '0.05em',
      },
    },
  },
  plugins: [],
}
