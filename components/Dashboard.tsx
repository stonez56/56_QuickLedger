import React, { useState, useEffect } from 'react';
import { AppConfig, LedgerRecord, RecordType } from '../types.ts';
import { Card } from './UI.tsx';
import { AnalyticsView } from './AnalyticsView.tsx';
import { TrendingUp, AlertCircle, Clock, CheckCircle2, DollarSign, Activity } from 'lucide-react';

interface DashboardProps {
  config: AppConfig;
  onNavigateToEdit: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
}

type FilterPeriod = 'current' | 'previous' | 'year';

export const Dashboard: React.FC<DashboardProps> = ({ config, onNavigateToEdit, fontSize }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('current');

  const sizeMap = {
    sm: { title: "text-lg", stat: "text-2xl", text: "text-sm", small: "text-xs" },
    base: { title: "text-xl", stat: "text-3xl", text: "text-base", small: "text-sm" },
    lg: { title: "text-2xl", stat: "text-4xl", text: "text-lg", small: "text-base" }
  }[fontSize];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Implement SWR (Stale-While-Revalidate) Cache
    const cached = sessionStorage.getItem('dashboard_records_cache');
    if (cached) {
      try {
        setRecords(JSON.parse(cached));
        setLoading(false); // Instantly show cached data
      } catch (e) {
        // parsing error, ignore
      }
    } else {
      setLoading(true);
    }
    
    setError(null);
    try {
      const payload = {
        action: 'getData',
        secret: config.apiSecret,
        userEmail: config.userEmail,
        // No date limits to get AR/AP across the year and all tax data
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
        // Only throw if we don't have cached data, otherwise silently update fails
        if (!cached) throw new Error(result.message || '載入失敗');
      }
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
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
    const currentBiMonth = Math.floor(today.getMonth() / 2); // 0-5

    if (periodType === 'year') {
      return d.getFullYear() === currentYear;
    }

    const recYear = d.getFullYear();
    const recBiMonth = Math.floor(d.getMonth() / 2);

    if (periodType === 'current') {
      return recYear === currentYear && recBiMonth === currentBiMonth;
    }

    if (periodType === 'previous') {
      if (currentBiMonth === 0) {
        // Prev period is Nov-Dec of previous year
        return recYear === currentYear - 1 && recBiMonth === 5;
      } else {
        return recYear === currentYear && recBiMonth === currentBiMonth - 1;
      }
    }
    
    return false;
  };

  const getPeriodLabel = (offset: number) => {
    const d = new Date();
    let biMonth = Math.floor(d.getMonth() / 2) + offset;
    if (biMonth < 0) biMonth = 5; // wrap around for previous year
    const startM = String(biMonth * 2 + 1).padStart(2, '0');
    const endM = String(biMonth * 2 + 2).padStart(2, '0');
    return `${startM}-${endM}月`;
  };

  // 1. Calculate Estimated Business Tax (本期預估應納營業稅)
  // Tax Payable = Output Tax (銷項) - Deductible Input Tax (可扣抵進項)
  let outputTax = 0;
  let deductibleInputTax = 0;
  
  // AR/AP Overdue records (應收/應付帳款警示)
  const overdueRecords: LedgerRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  records.forEach(record => {
    // Standardize amount logging
    const taxAmt = Number(record.tax) || 0;
    
    // Tax Calculation (Filtered by Period)
    if (isDateInPeriod(record.date, filterPeriod)) {
      if (record.type === '銷項 (收入)' && record.recordType !== RecordType.INTERNAL) {
        outputTax += taxAmt;
      } else if (record.type === '進項 (支出)' && record.recordType !== RecordType.INTERNAL) {
        // If it doesn't include '(不可扣抵)', it is deductible
        if (!record.taxType?.includes('不可扣抵')) {
          deductibleInputTax += taxAmt;
        }
      }
    }

    // AR/AP Calculation (Always Global, ignores filterPeriod)
    if (!record.paymentDate && record.expectedDate) {
      const expected = new Date(record.expectedDate);
      if (expected < today && record.recordType !== RecordType.INTERNAL) {
         overdueRecords.push(record);
      }
    }
  });

  const estimatedTaxPayable = outputTax - deductibleInputTax;
  const isTaxFavorable = estimatedTaxPayable <= 0; // If negative or zero, we don't owe tax (or get refund/carry forward)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Activity className="w-10 h-10 text-sky-500 mb-4 animate-spin-slow" />
        <p className={`text-slate-400 font-medium ${sizeMap.text}`}>儀表板資料載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className={`font-bold text-rose-400 mb-2 ${sizeMap.title}`}>儀表板載入失敗</h3>
        <p className={`text-rose-300/80 ${sizeMap.text}`}>{error}</p>
        <button onClick={fetchDashboardData} className={`mt-4 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-colors ${sizeMap.text}`}>
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Period Filter Row */}
      <div className="flex bg-slate-900/80 backdrop-blur-md rounded-lg p-1.5 border border-slate-800 w-full md:w-fit mb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
         <button
            onClick={() => setFilterPeriod('current')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'current' ? 'bg-sky-500/20 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
         >
            本期 {getPeriodLabel(0)}
         </button>
         <button
            onClick={() => setFilterPeriod('previous')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'previous' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
         >
            上期 {getPeriodLabel(-1)}
         </button>
         <button
            onClick={() => setFilterPeriod('year')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'year' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
         >
            本年度累計
         </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
         
         {/* Tax Payable Card */}
         <Card className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <TrendingUp className="w-24 h-24 text-sky-400" />
            </div>
            <div className="relative z-10 space-y-2">
               <h3 className={`font-semibold text-slate-400 flex items-center gap-2 ${sizeMap.text}`}>
                  <DollarSign className="w-5 h-5 text-sky-400" />
                  {filterPeriod === 'current' ? '本期' : filterPeriod === 'previous' ? '上期' : '本年度'}預估應納營業稅
               </h3>
               <div className="mt-2 flex items-baseline gap-2">
                  <span className={`font-mono font-bold tracking-tight ${isTaxFavorable ? 'text-emerald-400' : 'text-rose-400'} ${sizeMap.stat}`}>
                     ${Math.abs(estimatedTaxPayable).toLocaleString()}
                  </span>
                  <span className={`text-slate-500 ${sizeMap.text}`}>
                     {estimatedTaxPayable > 0 ? '(應繳納)' : '(留抵/免繳)'}
                  </span>
               </div>
               <div className={`mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-4 ${sizeMap.small}`}>
                  <div>
                     <p className="text-slate-500 mb-1">總銷項稅額</p>
                     <p className="text-slate-300 font-mono">${outputTax.toLocaleString()}</p>
                  </div>
                  <div>
                     <p className="text-slate-500 mb-1">可扣抵進項</p>
                     <p className="text-slate-300 font-mono">${deductibleInputTax.toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </Card>

         {/* AR/AP Summary Card */}
         <Card className={`p-6 relative overflow-hidden group ${overdueRecords.length > 0 ? 'border-rose-500/30' : 'border-emerald-500/20'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Clock className={`w-24 h-24 ${overdueRecords.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
            <div className="relative z-10 space-y-2">
               <h3 className={`font-semibold text-slate-400 flex items-center gap-2 ${sizeMap.text}`}>
                  <AlertCircle className={`w-5 h-5 ${overdueRecords.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                  應收/應付帳款警示
               </h3>
               {overdueRecords.length > 0 ? (
                  <>
                     <div className="mt-2 flex items-baseline gap-2">
                        <span className={`font-mono font-bold tracking-tight text-rose-400 ${sizeMap.stat}`}>
                           {overdueRecords.length}
                        </span>
                        <span className={`text-slate-500 ${sizeMap.text}`}>筆已逾期</span>
                     </div>
                     <p className={`mt-4 pt-4 border-t border-slate-800/60 text-slate-400 ${sizeMap.small}`}>
                        請盡速處理未結清之帳款，以維持現金流健康。
                     </p>
                  </>
               ) : (
                  <>
                     <div className="mt-2 flex items-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        <span className={`font-medium text-emerald-400 ${sizeMap.text}`}>所有帳款皆已於期限內收付！</span>
                     </div>
                     <p className={`mt-4 pt-4 border-t border-slate-800/60 text-slate-400 ${sizeMap.small}`}>
                        目前沒有超過預計收付款日的呆帳或欠款。
                     </p>
                  </>
               )}
            </div>
         </Card>
      </div>

      {/* AR/AP Detail List */}
      {overdueRecords.length > 0 && (
         <div className="space-y-4">
            <h3 className={`font-bold text-white flex items-center gap-2 ${sizeMap.title}`}>
               <AlertCircle className="w-5 h-5 text-rose-400" />
               逾期帳款明細
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {overdueRecords.map(record => (
                  <Card key={record.id} className="p-4 border border-rose-900/40 bg-rose-950/10 hover:border-rose-500/50 transition-colors flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <span className={`px-2 py-0.5 rounded font-medium ${
                              record.type === '銷項 (收入)' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                           } ${sizeMap.small}`}>
                              {record.type === '銷項 (收入)' ? '應收款 (催收)' : '應付款 (待付)'}
                           </span>
                           <span className={`font-mono tracking-tight text-slate-400 bg-slate-900 px-2 py-0.5 rounded ${sizeMap.small}`}>
                              {record.id}
                           </span>
                        </div>
                        <h4 className={`font-bold text-slate-200 mb-1 ${sizeMap.text}`}>{record.category || '未分類'}</h4>
                        {record.note && <p className={`text-slate-400 mb-3 ${sizeMap.small}`}>{record.note}</p>}
                     </div>
                     
                     <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-end">
                        <div className="space-y-1">
                           <p className={`text-rose-400/80 font-medium ${sizeMap.small}`}>
                              預計日：{record.expectedDate}
                           </p>
                           <p className={`font-mono font-bold tracking-tight text-white ${sizeMap.title}`}>
                              ${Number(record.total).toLocaleString()}
                           </p>
                        </div>
                        <button
                           onClick={() => onNavigateToEdit(record)}
                           className={`px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors font-medium border border-slate-700 ${sizeMap.small}`}
                        >
                           點擊結清
                        </button>
                     </div>
                  </Card>
               ))}
            </div>
         </div>
      )}

      {/* 4. Analytics View (Charts) */}
      {!loading && !error && records.length > 0 && (
          <AnalyticsView records={records} fontSize={fontSize} />
      )}
    </div>
  );
};
