import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm.tsx';
import { InvoiceForm } from './components/InvoiceForm.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { AppConfig } from './types.ts';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Attempt to load from localStorage to persist login
    const savedConfig = localStorage.getItem('app_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Basic validation to ensure the saved config is useful
        if (parsed.scriptUrl && parsed.userEmail && parsed.apiSecret) {
            setConfig(parsed);
        }
      } catch (e) {
        localStorage.removeItem('app_config');
      }
    }
  }, []);

  const handleLogin = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('app_config', JSON.stringify(newConfig));
  };

  const handleLogout = () => {
    setConfig(null);
    localStorage.removeItem('app_config');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-900/10 blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        {!config ? (
          <AuthForm onLogin={handleLogin} />
        ) : (
          <InvoiceForm config={config} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}