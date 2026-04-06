import React, { useState } from 'react';
import { AppConfig, LedgerRecord } from '../types';
import { Dashboard } from './Dashboard';
import { CategorySettings } from './Settings/CategorySettings';
import { FormatCodeSettings } from './Settings/FormatCodeSettings';
import { SystemSettings } from './Settings/SystemSettings';
import { LayoutDashboard, Tags, ListTree, PieChart as PieChartIcon, TrendingDown, AlertCircle, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface AdminLayoutProps {
  config: AppConfig;
  onNavigateToEdit?: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
  isActive: boolean;
}

type FilterPeriod = 'current' | 'previous' | 'year';

export const AdminLayout: React.FC<AdminLayoutProps> = ({ config, onNavigateToEdit, fontSize, isActive }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'categories' | 'formatCodes' | 'systemSettings'>('dashboard');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('current');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<LedgerRecord[]>([]);

  React.useEffect(() => {
    if (isActive) {
      fetchDashboardData();
    }
  }, [isActive]);

  const fetchDashboardData = async () => {
    const cached = sessionStorage.getItem('dashboard_records_cache');
    if (cached) {
      try {
        setRecords(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    } else {
      setLoading(true);
    }
    
    setError(null);
    try {
      const payload = {
        action: 'getData',
        secret: config.apiSecret,
        userEmail: config.userEmail,
      };

      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        const freshRecords = result.data || [];
        setRecords(freshRecords);
        sessionStorage.setItem('dashboard_records_cache', JSON.stringify(freshRecords));
      } else {
        if (!cached) throw new Error(result.message || '載入失敗');
      }
    } catch (err: any) {
      if (!cached) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDateInPeriod = (dateStr: string, periodType: FilterPeriod) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentBiMonth = Math.floor(today.getMonth() / 2);

    if (periodType === 'year') return d.getFullYear() === currentYear;
    
    const recYear = d.getFullYear();
    const recBiMonth = Math.floor(d.getMonth() / 2);

    if (periodType === 'current') return recYear === currentYear && recBiMonth === currentBiMonth;
    if (periodType === 'previous') {
      if (currentBiMonth === 0) return recYear === currentYear - 1 && recBiMonth === 5;
      return recYear === currentYear && recBiMonth === currentBiMonth - 1;
    }
    return false;
  };

  const getPeriodLabel = (offset: number) => {
    const d = new Date();
    let biMonth = Math.floor(d.getMonth() / 2) + offset;
    if (biMonth < 0) biMonth = 5;
    const startM = String(biMonth * 2 + 1).padStart(2, '0');
    const endM = String(biMonth * 2 + 2).padStart(2, '0');
    return `${startM}-${endM}月`;
  };

  const currentPeriodLabel = React.useMemo(() => {
    if (filterPeriod === 'year') return '本年度';
    if (filterPeriod === 'current') return `本期 ${getPeriodLabel(0)}`;
    if (filterPeriod === 'previous') return `上期 ${getPeriodLabel(-1)}`;
    return '全期';
  }, [filterPeriod]);

  const pieData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    records.forEach(r => {
      const amt = Number(r.total) || 0;
      if (r.type === '進項 (支出)' && amt > 0 && isDateInPeriod(r.date, filterPeriod)) {
        const cat = r.category || '未分類';
        categories[cat] = (categories[cat] || 0) + amt;
      }
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [records, filterPeriod]);

  const COLORS = ['#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239'];


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
            <button
              onClick={() => setActiveTab('systemSettings')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'systemSettings'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings size={18} />
              系統與備份
            </button>
          </div>
        </div>

        {/* Sidebar Pie Chart Snapshot - ONLY ON DESKTOP */}
        <div className="hidden md:block mt-4 flex-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-4 min-h-[300px] flex flex-col">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <PieChartIcon size={14} className="text-rose-400" />
              TOP 5 支出結構 ({currentPeriodLabel})
            </h4>
            
            <div className="h-[200px] w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '10px' }}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic gap-2 text-center py-8">
                  <TrendingDown size={32} className="opacity-20" />
                  <p>尚無支出資料</p>
                </div>
              )}
            </div>

            {pieData.length > 0 && (
              <div className="mt-4 space-y-2">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-2 truncate mr-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm shadow-black/40" style={{ backgroundColor: COLORS[idx] }} />
                      <span className="text-slate-400 truncate text-[11px] group-hover/item:text-slate-200 transition-colors">
                        {item.name.replace(' (⚠️ 稅額不可扣抵)', '').replace('：', ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-slate-100 font-bold shrink-0 text-sm tracking-tight">
                      ${item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto hide-scrollbar">
        {activeTab === 'dashboard' && (
          <Dashboard 
            config={config} 
            onNavigateToEdit={onNavigateToEdit} 
            fontSize={fontSize} 
            records={records}
            loading={loading}
            error={error}
            onRefresh={fetchDashboardData}
            filterPeriod={filterPeriod}
            setFilterPeriod={setFilterPeriod}
            isDateInPeriod={isDateInPeriod}
            getPeriodLabel={getPeriodLabel}
          />
        )}
        {activeTab === 'categories' && <CategorySettings />}
        {activeTab === 'formatCodes' && <FormatCodeSettings />}
        {activeTab === 'systemSettings' && <SystemSettings config={config} records={records} />}
      </div>
    </div>
  );
};
