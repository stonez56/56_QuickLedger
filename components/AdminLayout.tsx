import React, { useState } from 'react';
import { AppConfig, LedgerRecord } from '../types';
import { Dashboard } from './Dashboard';
import { CategorySettings } from './Settings/CategorySettings';
import { FormatCodeSettings } from './Settings/FormatCodeSettings';
import { LayoutDashboard, Tags, ListTree } from 'lucide-react';

interface AdminLayoutProps {
  config: AppConfig;
  onNavigateToEdit?: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ config, onNavigateToEdit, fontSize }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'categories' | 'formatCodes'>('dashboard');

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Admin Sidebar / Top Nav on Mobile */}
      <div className="md:w-64 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl sticky top-4">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <h2 className="font-semibold text-slate-100 flex items-center">
              管理中心
            </h2>
          </div>
          <div className="flex flex-row md:flex-col p-2 gap-1 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard size={18} />
              儀表板總覽
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ListTree size={18} />
              會計科目設定
            </button>
            <button
              onClick={() => setActiveTab('formatCodes')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'formatCodes'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Tags size={18} />
              格式代號設定
            </button>
          </div>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 min-w-0">
        {activeTab === 'dashboard' && (
          <Dashboard config={config} onNavigateToEdit={onNavigateToEdit} fontSize={fontSize} />
        )}
        {activeTab === 'categories' && <CategorySettings />}
        {activeTab === 'formatCodes' && <FormatCodeSettings />}
      </div>
    </div>
  );
};
