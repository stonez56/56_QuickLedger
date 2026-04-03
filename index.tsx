import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { install } from '@twind/core';
import presetTailwind from '@twind/preset-tailwind';
import presetAutoprefix from '@twind/preset-autoprefix';

// Initialize Twind
install({
  presets: [presetTailwind(), presetAutoprefix()],
  theme: {
    extend: {
      colors: {
        'secondary-fixed-dim': 'var(--color-secondary-fixed-dim)',
        'primary-container': 'var(--color-primary-container)',
        tertiary: 'var(--color-tertiary)',
        'on-secondary-fixed-variant': 'var(--color-on-secondary-fixed-variant)',
        'tertiary-fixed': 'var(--color-tertiary-fixed)',
        'on-primary-container': 'var(--color-on-primary-container)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'surface-tint': 'var(--color-surface-tint)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'on-surface': 'var(--color-on-surface)',
        'surface-dim': 'var(--color-surface-dim)',
        'on-tertiary-container': 'var(--color-on-tertiary-container)',
        'on-background': 'var(--color-on-background)',
        'on-tertiary-fixed-variant': 'var(--color-on-tertiary-fixed-variant)',
        error: 'var(--color-error)',
        'on-primary-fixed-variant': 'var(--color-on-primary-fixed-variant)',
        'secondary-fixed': 'var(--color-secondary-fixed)',
        'on-tertiary-fixed': 'var(--color-on-tertiary-fixed)',
        'primary-fixed-dim': 'var(--color-primary-fixed-dim)',
        'primary-fixed': 'var(--color-primary-fixed)',
        'outline-variant': 'var(--color-outline-variant)',
        primary: 'var(--color-primary)',
        'on-tertiary': 'var(--color-on-tertiary)',
        'inverse-surface': 'var(--color-inverse-surface)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'on-primary-fixed': 'var(--color-on-primary-fixed)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        'on-error-container': 'var(--color-on-error-container)',
        surface: 'var(--color-surface)',
        'tertiary-fixed-dim': 'var(--color-tertiary-fixed-dim)',
        'surface-variant': 'var(--color-surface-variant)',
        'surface-bright': 'var(--color-surface-bright)',
        'on-error': 'var(--color-on-error)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'secondary-container': 'var(--color-secondary-container)',
        outline: 'var(--color-outline)',
        'on-secondary-container': 'var(--color-on-secondary-container)',
        'inverse-primary': 'var(--color-inverse-primary)',
        'tertiary-container': 'var(--color-tertiary-container)',
        'surface-container': 'var(--color-surface-container)',
        'on-primary': 'var(--color-on-primary)',
        'error-container': 'var(--color-error-container)',
        'on-secondary-fixed': 'var(--color-on-secondary-fixed)',
        secondary: 'var(--color-secondary)',
        'on-secondary': 'var(--color-on-secondary)',
        'inverse-on-surface': 'var(--color-inverse-on-surface)',
        background: 'var(--color-background)',
      },
      fontFamily: {
        sans: ['Inter', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
        headline: ['Inter', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
        body: ['Inter', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
        label: ['Inter', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  darkMode: 'class',
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);