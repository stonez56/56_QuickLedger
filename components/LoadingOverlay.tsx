import React from 'react';
import { Cloud, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "同步雲端資料中" }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-500">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-emerald-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-500/30 animate-pulse-slow">
            <Cloud size={48} className="text-slate-950" />
          </div>
          <div className="absolute -top-3 -right-3 bg-background rounded-full p-1.5 border border-outline-variant shadow-xl">
            <Sparkles size={24} className="text-tertiary animate-spin-slow" />
          </div>
          
          {/* Circular Progress Ring */}
          <div className="absolute inset-[-8px] border-4 border-primary/10 rounded-[2.5rem]" />
          <div className="absolute inset-[-8px] border-4 border-primary border-t-transparent rounded-[2.5rem] animate-spin" />
        </div>
        
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-on-surface tracking-wide">
            {message}
          </h2>
          <p className="text-on-surface-variant text-sm font-medium tracking-widest uppercase flex items-center justify-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
            Synchronizing
            <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-3">
        <div className="h-1 w-12 rounded-full bg-surface-container overflow-hidden">
          <div className="h-full bg-primary w-full -translate-x-full animate-shimmer" />
        </div>
        <span className="text-[10px] text-on-surface-variant font-mono tracking-tighter uppercase">56 QuickLedger Engine</span>
        <div className="h-1 w-12 rounded-full bg-surface-container overflow-hidden">
          <div className="h-full bg-primary w-full -translate-x-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
};
