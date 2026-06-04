import type { Config } from 'tailwindcss'

/**
 * VisionOps "industrial terminal" design tokens.
 * Dark, technical, monospace-accented, with a severity color system
 * (amber = warning/escalate, red = critical, green = success/silent-file).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        void: '#0A0B0D', // near-black page background
        surface: '#111318', // card / panel background
        'surface-2': '#15181F', // raised panel
        border: '#1E2230', // subtle border
        muted: '#2A2F3F', // disabled / grid lines

        // Typography
        ink: '#E8EAF0', // primary text
        'ink-dim': '#8B92A8', // secondary / metadata text
        'ink-code': '#AEB6CE', // monospace / terminal text

        // Severity / accent system
        amber: '#F5A623', // warning / escalation / HIGH
        'amber-dim': '#3A2A0E', // amber background tint
        red: '#FF5C5C', // critical / no-match
        'red-dim': '#3A1414', // red background tint
        green: '#3DD68C', // success / happy path / LOW
        'green-dim': '#0F3D24', // green background tint
        blue: '#4D9EFF', // neutral accent / link

        // Sponsor brand accents
        phinite: '#8B7CF0', // Phinite
        gmi: '#22CCEE', // GMI Cloud
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        'hero-sub': ['clamp(1rem, 2.4vw, 1.375rem)', { lineHeight: '1.6' }],
        'section-title': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        deck: '1180px',
      },
      backgroundImage: {
        'grid-void':
          'linear-gradient(rgba(30,34,48,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(30,34,48,0.45) 1px, transparent 1px)',
        'radial-amber': 'radial-gradient(circle at 50% 0%, rgba(245,166,35,0.10), transparent 60%)',
      },
      backgroundSize: {
        'grid-void': '44px 44px',
      },
      boxShadow: {
        'glow-amber': '0 0 24px rgba(245,166,35,0.22)',
        'glow-green': '0 0 24px rgba(61,214,140,0.22)',
        'glow-red': '0 0 24px rgba(255,92,92,0.22)',
        'glow-gmi': '0 0 24px rgba(34,204,238,0.20)',
        'glow-phinite': '0 0 24px rgba(139,124,240,0.20)',
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.8)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pulseAmber: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        flow: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        scanline: 'scanline 8s linear infinite',
        'pulse-amber': 'pulseAmber 1.8s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
        flow: 'flow 1s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
