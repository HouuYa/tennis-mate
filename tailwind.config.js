/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tennis: {
          green: '#d4e157', // Tennis ball green
          dark: '#1a2c2c', // Deep green/black background
          court: '#3e885b', // Court green
          clay: '#d66d4f', // Clay court orange
        }
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#c7d2fe',
            maxWidth: 'none',
            p: {
              marginBottom: '0.75rem',
              lineHeight: '1.6',
            },
            ul: {
              paddingLeft: '1.25rem',
              marginBottom: '0.75rem',
            },
            li: {
              marginBottom: '0.375rem',
              lineHeight: '1.5',
            },
            hr: {
              borderColor: 'rgba(99, 102, 241, 0.2)',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            h3: {
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#a5b4fc',
              marginBottom: '0.5rem',
            },
            small: {
              color: '#94a3b8',
              fontSize: '0.75rem',
            },
            sup: {
              fontSize: '0.7em',
              color: '#818cf8',
            },
            strong: {
              fontWeight: '600',
              color: '#c7d2fe',
            },
          },
        },
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
