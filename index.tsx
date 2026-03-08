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
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
      }
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