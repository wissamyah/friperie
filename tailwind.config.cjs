/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark War Survival Theme - Post-Apocalyptic Military
        creed: {
          // Dark backgrounds
          darker: '#0a0e14',
          dark: '#0f1419',
          base: '#151a21',
          light: '#1a2129',
          lighter: '#2d3748',
          // Accent colors - Military/Tactical
          primary: '#4a90e2', // Muted professional blue
          secondary: '#5b7ca6', // Slate blue-gray
          accent: '#00d9ff', // Tactical cyan
          success: '#4ade80', // Mission success green
          danger: '#ef4444', // Critical red
          warning: '#facc15', // Caution yellow
          // Text colors - Enhanced for better contrast
          muted: '#9ca3af', // Lighter gray for better readability
          text: '#f3f4f6', // Brighter white for primary text
          'text-bright': '#ffffff', // Pure white for emphasis
        },
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'], // Military/tactical font
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(74, 144, 226, 0.2)',
        'glow-accent': '0 0 20px rgba(0, 217, 255, 0.3)',
        'tactical': '0 4px 6px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 6px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 2px 4px rgba(0, 0, 0, 0.4)',
        'button-3d': '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'spin': 'spin 0.6s linear infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -20px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '75%': { transform: 'translate(20px, 20px) scale(1.05)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
