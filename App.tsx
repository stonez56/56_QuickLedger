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
  const [previousTab, setPreviousTab] = useState<'admin' | 'search' | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
    sessionStorage.removeItem('dashboard_records_cache'); // Clear cache on logout
  };

  const handleEdit = (record: LedgerRecord) => {
    setPreviousTab(activeTab === 'admin' ? 'admin' : 'search');
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 pb-20 ${fontSizeClass}`}>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-900/10 blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 md:p-6">
        {!config ? (
          <AuthForm onLogin={handleLogin} />
        ) : (
          <ConfigProvider config={config}>
            <MainContent 
               config={config}
               showSplash={showSplash}
               activeTab={activeTab}
               setActiveTab={setActiveTab}
               previousTab={previousTab}
               lastEditedId={lastEditedId}
               setLastEditedId={setLastEditedId}
               scrollTargetId={scrollTargetId}
               setScrollTargetId={setScrollTargetId}
               refreshTrigger={refreshTrigger}
               setRefreshTrigger={setRefreshTrigger}
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
      </div>

      {showSettings && <HelpSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

const MainContent = ({ 
  config, showSplash, activeTab, setActiveTab, previousTab, 
  lastEditedId, setLastEditedId, scrollTargetId, setScrollTargetId, 
  refreshTrigger, setRefreshTrigger,
  editRecord, setEditRecord, fontSize, setFontSize, setShowSettings, 
  handleLogout, handleEdit, getFormattedDate 
}: any) => {
  const { isLoading } = useConfig();
  
  return (
    <>
      {(isLoading && !showSplash) && <LoadingOverlay />}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 1. Global App Header (Logo & Interactions) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-4 mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center whitespace-nowrap shrink-0">
            <img src="/light_stonez56_256x265_icon.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 mr-3 object-contain" />
            Stonez56 收支快記雲 <span className="ml-2 text-sm text-sky-400 font-mono">{APP_VERSION}</span>
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Font Size Toggle */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 items-center">
              <Type className="w-4 h-4 text-slate-500 mx-2" />
              <button onClick={() => setFontSize('sm')} className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'sm' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>小</button>
              <button onClick={() => setFontSize('base')} className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'base' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>中</button>
              <button onClick={() => setFontSize('lg')} className={`px-2 py-1 rounded text-xs transition-colors ${fontSize === 'lg' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>大</button>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Settings size={14} className="mr-1.5" />
              說明
            </button>

            {config.sheetUrl && (
              <a 
                href={config.sheetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-sky-400 bg-sky-950/50 border border-sky-900/50 rounded-lg hover:bg-sky-900/50 transition-colors"
              >
                <Table2 size={14} className="mr-1.5" />
                報表
                <ExternalLink size={12} className="ml-1 opacity-50" />
              </a>
            )}
            <button 
              onClick={handleLogout} 
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium bg-slate-800/80 hover:bg-rose-900/40 text-rose-400 border border-slate-700 hover:border-rose-900/50 rounded-lg transition-colors"
            >
              <LogOut size={14} className="mr-1.5" />登出
            </button>
          </div>
        </div>

        {/* 2. Secondary Navigation (Tabs & User Info) */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between z-40 relative">
          <div className="flex bg-slate-900/80 backdrop-blur-md rounded-lg p-1.5 border border-slate-800 shadow-xl w-full md:w-auto overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button
              onClick={() => { setActiveTab('create'); setEditRecord(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 flex items-center justify-center ${activeTab === 'create' && !editRecord ? 'bg-sky-500/20 text-sky-400 shadow-sm' : editRecord && activeTab === 'create' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <FilePlus className="w-4 h-4 mr-2" />
              {editRecord ? '編輯憑證中' : '新增憑證'}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 flex items-center justify-center ${activeTab === 'search' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <Search className="w-4 h-4 mr-2" />
              歷史查詢
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 flex items-center justify-center ${activeTab === 'admin' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              管理中心
            </button>
          </div>
          
          <div className="flex items-center justify-end w-full md:w-auto gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700">{new Date().getFullYear()} 帳期</span>
            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700">{getFormattedDate()}</span>
            <span className="text-sky-400 text-sm truncate max-w-[200px] font-medium bg-sky-950/30 px-3 py-1 rounded border border-sky-900/30">
              {config.userEmail.split('@')[0]}
            </span>
          </div>
        </div>
        
        {/* 3. Main Content Area */}
        <div className="pt-2">
          <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
            <AdminLayout 
              config={config} 
              onNavigateToEdit={handleEdit} 
              fontSize={fontSize} 
              isActive={activeTab === 'admin'}
            />
          </div>
          <div className={activeTab === 'create' ? 'block' : 'hidden'}>
            <InvoiceForm 
              config={config} 
              initialData={editRecord}
              onClearEdit={(wasSaved?: boolean) => {
                const editedId = editRecord?.id;
                setEditRecord(null);
                if (previousTab) setActiveTab(previousTab);
                if (wasSaved && editedId) {
                  setLastEditedId(editedId);
                  setScrollTargetId(editedId);
                  setRefreshTrigger((prev: number) => prev + 1);
                } else {
                  setLastEditedId(null);
                  if (editedId) setScrollTargetId(editedId);
                }
              }}
            />
          </div>
          <div className={activeTab === 'search' ? 'block' : 'hidden'}>
            <SearchPanel 
              config={config} 
              onEdit={handleEdit}
              fontSize={fontSize}
              lastEditedId={lastEditedId}
              scrollTargetId={scrollTargetId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </>
  );
};