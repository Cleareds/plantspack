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
        // Verdant Ethos - Surfaces
        surface: '#f7f7f2',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f1ec',
        'surface-container': '#e8e9e3',
        'surface-container-high': '#e2e3dd',
        'surface-container-highest': '#dcddd7',
        'surface-variant': '#dcddd7',
        // Primary
        primary: '#0a6a1d',
        'primary-container': '#9df898',
        // Secondary
        secondary: '#72554b',
        'secondary-container': '#ff9473',
        // Tertiary
        tertiary: '#a83206',
        'tertiary-container': '#ff9473',
        // Text
        'on-surface': '#2d2f2c',
        'on-surface-variant': '#5a5c58',
        'on-primary': '#d1ffc8',
        'on-primary-btn': '#ffffff',
        'on-secondary': '#ffffff',
        // Outline
        outline: '#767773',
        'outline-variant': '#adada9',
        // Error
        error: '#b02500',
        'on-error': '#ffffff',
        // Inverse
        'inverse-surface': '#2d2f2c',
        'inverse-on-surface': '#f1f1ec',
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
        'ambient': '0 10px 30px rgba(45, 47, 44, 0.06)',
        'ambient-lg': '0 20px 40px rgba(45, 47, 44, 0.08)',
        'editorial': '0 32px 64px -16px rgba(10, 106, 29, 0.12)',
      },
      letterSpacing: {
        'editorial': '-0.02em',
        'label': '0.05em',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
