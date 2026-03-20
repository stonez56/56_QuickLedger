import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm.tsx';
import { InvoiceForm } from './components/InvoiceForm.tsx';
import { SearchPanel } from './components/SearchPanel.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { AppConfig, LedgerRecord } from './types.ts';
import { FilePlus, Search } from 'lucide-react';
import { APPS_SCRIPT_URL } from './constants.ts';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'search'>('create');
  const [editRecord, setEditRecord] = useState<LedgerRecord | null>(null);

  useEffect(() => {
    // Attempt to load from localStorage to persist login
    const savedConfig = localStorage.getItem('app_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Basic validation to ensure the saved config is useful
        if (parsed.userEmail && parsed.apiSecret) {
            // Priority: Environment Variable/Constants > Cached URL
            parsed.scriptUrl = APPS_SCRIPT_URL;
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

  const handleEdit = (record: LedgerRecord) => {
    setEditRecord(record);
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 pb-20">
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Navigation / Tab Bar */}
            <div className="flex bg-slate-900/80 backdrop-blur-md rounded-lg p-1.5 border border-slate-800 shadow-xl w-full max-w-sm mx-auto sticky top-4 z-40">
                <button
                    onClick={() => { setActiveTab('create'); setEditRecord(null); }}
                    className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'create' && !editRecord ? 'bg-sky-500/20 text-sky-400 shadow-sm' : editRecord && activeTab === 'create' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                    <FilePlus className="w-4 h-4 mr-2" />
                    {editRecord ? '編輯憑證中' : '新增憑證'}
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'search' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                    <Search className="w-4 h-4 mr-2" />
                    歷史查詢
                </button>
            </div>
            
            <div className="pt-2">
              {activeTab === 'create' ? (
                <InvoiceForm 
                  config={config} 
                  onLogout={handleLogout} 
                  initialData={editRecord}
                  onClearEdit={() => setEditRecord(null)}
                />
              ) : (
                <SearchPanel 
                  config={config} 
                  onEdit={handleEdit}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}