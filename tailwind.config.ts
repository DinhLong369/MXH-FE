import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/composables/**/*.{js,ts}',
    './app/stores/**/*.{js,ts}',
    './app/app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'blob-1': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(40px,-30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        'blob-2': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(-30px,20px) scale(1.05)' },
          '66%': { transform: 'translate(25px,-15px) scale(0.9)' },
        },
        'blob-3': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(20px,30px) scale(0.95)' },
          '66%': { transform: 'translate(-25px,-20px) scale(1.1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'blob-1': 'blob-1 18s ease-in-out infinite',
        'blob-2': 'blob-2 22s ease-in-out infinite',
        'blob-3': 'blob-3 20s ease-in-out infinite',
        fadeIn: 'fadeIn 0.5s ease-out',
      },
    },
  },
}
