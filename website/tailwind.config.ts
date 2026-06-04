import type { Config } from 'tailwindcss'

// Minimal scaffold config. The full industrial-terminal token system is added in B2.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
