import React, { useState, useEffect } from 'react';
import { AuthForm } from './components/AuthForm.tsx';
import { InvoiceForm } from './components/InvoiceForm.tsx';
import { SearchPanel } from './components/SearchPanel.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { AdminLayout } from './components/AdminLayout.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { LoadingOverlay } from './components/LoadingOverlay.tsx';
import { HelpSettingsModal } from './components/HelpSettingsModal.tsx';
import { ConfigProvider, useConfig } from './contexts/ConfigContext.tsx';
import { AppConfig, LedgerRecord } from './types.ts';
import { FilePlus, Search, Settings, Table2, ExternalLink, Type, LogOut, Settings2 } from 'lucide-react';
import { APPS_SCRIPT_URL, APP_VERSION } from './constants.ts';
import { getTaiwanDateString } from './utils/date.ts';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'admin' | 'create' | 'search'>('create');
  const [editRecord, setEditRecord] = useState<LedgerRecord | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSettings, setShowSettings] = useState(false);

  const getFormattedDate = () => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const twDateStr = getTaiwanDateString(); // Forces YYYY-MM-DD in UTC+8
    const [yyyy, mm, dd] = twDateStr.split('-');
    
    // We parse the local string parts to get the correct weekday
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    const day = days[d.getDay()];
    return `${mm}月${dd}日(${day})`;
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('app_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.userEmail && parsed.apiSecret) {
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
    sessionStorage.removeItem('dashboard_records_cache');
  };

  const handleEdit = (record: LedgerRecord) => {
    setEditRecord(record);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  }[fontSize];

  return (
    <div className={`min-h-screen bg-background text-on-background font-sans selection:bg-primary-container/30 pb-24 md:pb-8 ${fontSizeClass}`}>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Background Gradient Mesh for Light aesthetic */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-fixed/50 blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-tertiary-fixed/50 blur-[100px]" />
      </div>

      {!config ? (
        <div className="relative z-10 p-4 md:p-6 flex items-center justify-center min-h-screen">
          <AuthForm onLogin={handleLogin} />
        </div>
      ) : (
        <ConfigProvider config={config}>
          <MainContent 
             config={config}
             showSplash={showSplash}
             activeTab={activeTab}
             setActiveTab={setActiveTab}
             editRecord={editRecord}
             setEditRecord={setEditRecord}
             fontSize={fontSize}
             setFontSize={setFontSize}
             setShowSettings={setShowSettings}
             handleLogout={handleLogout} 
             handleEdit={handleEdit}
             getFormattedDate={getFormattedDate}
          />
        </ConfigProvider>
      )}

      {showSettings && <HelpSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

const MainContent = ({ 
  config, showSplash, activeTab, setActiveTab, editRecord, setEditRecord, 
  fontSize, setFontSize, setShowSettings, handleLogout, handleEdit, 
  getFormattedDate 
}: any) => {
  const { isLoading } = useConfig();
  
  return (
    <>
      {(isLoading && !showSplash) && <LoadingOverlay />}

      {/* FIXED TOP APP BAR */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm px-4 md:px-8 py-3 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container bg-surface-container-highest flex items-center justify-center">
            <img src="/light_stonez56_256x265_icon.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-on-surface">Stonez56</span>
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest leading-none hidden md:block">{APP_VERSION}</span>
          </div>
        </div>
        
        {/* Desktop Tabs & Tools */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center max-w-2xl mx-auto">
           <button onClick={() => { setActiveTab('create'); setEditRecord(null); }}
             className={`px-4 py-2 font-bold rounded-full transition-all ${activeTab === 'create' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
             <span className="flex items-center gap-2"><FilePlus size={18} /> {editRecord ? '編輯憑證中' : '新增憑證'}</span>
           </button>
           <button onClick={() => setActiveTab('search')}
             className={`px-4 py-2 font-bold rounded-full transition-all ${activeTab === 'search' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
             <span className="flex items-center gap-2"><Search size={18} /> 歷史查詢</span>
           </button>
           <button onClick={() => setActiveTab('admin')}
             className={`px-4 py-2 font-bold rounded-full transition-all ${activeTab === 'admin' ? 'bg-tertiary-container text-on-tertiary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
             <span className="flex items-center gap-2"><Settings2 size={18} /> 管理中心</span>
           </button>
        </div>

        {/* Right Tools Group */}
        <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex bg-surface-container-high rounded-lg p-1 border border-outline-variant/50 items-center">
              <Type className="w-4 h-4 text-outline mx-1" />
              <button onClick={() => setFontSize('sm')} className={`px-2 py-0.5 rounded text-xs transition-colors ${fontSize === 'sm' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface hover:bg-surface-container-highest'}`}>小</button>
              <button onClick={() => setFontSize('base')} className={`px-2 py-0.5 rounded text-xs transition-colors ${fontSize === 'base' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface hover:bg-surface-container-highest'}`}>中</button>
              <button onClick={() => setFontSize('lg')} className={`px-2 py-0.5 rounded text-xs transition-colors ${fontSize === 'lg' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface hover:bg-surface-container-highest'}`}>大</button>
            </div>
            {config.sheetUrl && (
              <a href={config.sheetUrl} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center px-3 py-1.5 text-sm font-bold text-primary bg-primary-container/20 rounded-full hover:bg-primary-container/40 transition-colors">
                <Table2 size={16} className="mr-1.5" />報表
              </a>
            )}
            <button onClick={() => setShowSettings(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <Settings size={20} />
            </button>
            <button onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full text-error hover:bg-error-container/50 transition-colors">
              <LogOut size={20} />
            </button>
        </div>
      </nav>

      <div className="relative z-10 p-4 md:p-6 max-w-4xl mx-auto pt-20 md:pt-24 min-h-[calc(100vh-6rem)]">
        {/* Context info for Current Session */}
        <div className="flex items-center gap-2 mb-6 overscroll-x-auto whitespace-nowrap hide-scrollbar">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/50 shadow-sm">{new Date().getFullYear()} 帳期</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/50 shadow-sm">{getFormattedDate()}</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container/30 text-primary border border-primary/20 shadow-sm truncate max-w-[150px] md:max-w-xs">{config.userEmail.split('@')[0]}</span>
        </div>
        
        {/* Main Content Area */}
        <main className="w-full">
          {activeTab === 'admin' ? (
            <AdminLayout 
              config={config} 
              onNavigateToEdit={handleEdit} 
              fontSize={fontSize} 
            />
          ) : activeTab === 'create' ? (
            <InvoiceForm 
              config={config} 
              initialData={editRecord}
              onClearEdit={() => setEditRecord(null)}
            />
          ) : (
            <SearchPanel 
              config={config} 
              onEdit={handleEdit}
              fontSize={fontSize}
            />
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-surface-container-lowest/90 backdrop-blur-xl z-50 rounded-t-[1.5rem] border-t border-outline-variant/30 shadow-[0px_-10px_30px_rgba(82,69,53,0.04)]">
        <button onClick={() => { setActiveTab('create'); setEditRecord(null); }}
          className={`flex flex-col items-center justify-center px-4 py-2 transition-all active:scale-90 duration-300 ${activeTab === 'create' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-lg -translate-y-1' : 'text-on-surface-variant hover:text-primary'}`}>
          <FilePlus size={activeTab === 'create' ? 24 : 20} className={activeTab === 'create' ? 'mb-0.5' : 'mb-1'} />
          <span className="text-xs font-bold">{editRecord ? '編輯' : '新增'}</span>
        </button>
        <button onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center px-4 py-2 transition-all active:scale-90 duration-300 ${activeTab === 'search' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-lg -translate-y-1' : 'text-on-surface-variant hover:text-primary'}`}>
          <Search size={activeTab === 'search' ? 24 : 20} className={activeTab === 'search' ? 'mb-0.5' : 'mb-1'} />
          <span className="text-xs font-bold">歷史</span>
        </button>
        <button onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center px-4 py-2 transition-all active:scale-90 duration-300 ${activeTab === 'admin' ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-lg -translate-y-1' : 'text-on-surface-variant hover:text-primary'}`}>
          <Settings2 size={activeTab === 'admin' ? 24 : 20} className={activeTab === 'admin' ? 'mb-0.5' : 'mb-1'} />
          <span className="text-xs font-bold">管理</span>
        </button>
      </nav>
    </>
  );
};