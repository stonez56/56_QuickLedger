import React, { useEffect, useState } from 'react';
import { Receipt, Sparkles } from 'lucide-react';
import { APP_VERSION } from '../constants.ts';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.5s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // Completely remove after 3s
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-500/20 rounded-full blur-[80px]" />
      
      <div className="relative z-10 flex flex-col items-center animate-pulse-slow">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-emerald-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/20">
            <Receipt size={40} className="text-slate-950" />
          </div>
          <div className="absolute -top-2 -right-2 bg-slate-950 rounded-full p-1">
            <Sparkles size={20} className="text-amber-400" />
          </div>
        </div>
        
        <div className="relative z-10 text-center animate-in slide-in-from-bottom-5 duration-700 delay-300">
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight flex items-center justify-center gap-4">
            <img src="/light_stonez56_256x265_icon.png" alt="Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
            收支快記雲
        </h1>
        <p className="mt-4 text-sky-200 text-lg md:text-xl font-medium tracking-wide">
          {APP_VERSION}
        </p>
        <p className="mt-1 text-slate-400 text-sm font-medium tracking-widest uppercase">
          56 QuickLedger
        </p>
      </div>
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};
