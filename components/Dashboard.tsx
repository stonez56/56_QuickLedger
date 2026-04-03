import React, { useState, useEffect } from 'react';
import { AppConfig, LedgerRecord, RecordType } from '../types.ts';
import { Card } from './UI.tsx';
import { AnalyticsView } from './AnalyticsView.tsx';
import { TrendingUp, AlertCircle, Clock, CheckCircle2, DollarSign, Activity } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay.tsx';

interface DashboardProps {
  config: AppConfig;
  onNavigateToEdit: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
  records: LedgerRecord[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  filterPeriod: FilterPeriod;
  setFilterPeriod: (period: FilterPeriod) => void;
  isDateInPeriod: (dateStr: string, periodType: FilterPeriod) => boolean;
  getPeriodLabel: (offset: number) => string;
}

type FilterPeriod = 'current' | 'previous' | 'year';

export const Dashboard: React.FC<DashboardProps> = ({ 
  config, onNavigateToEdit, fontSize, records, loading, error, onRefresh,
  filterPeriod, setFilterPeriod, isDateInPeriod, getPeriodLabel
}) => {

  const sizeMap = {
    sm: { title: "text-lg", stat: "text-2xl", text: "text-sm", small: "text-xs" },
    base: { title: "text-xl", stat: "text-3xl", text: "text-base", small: "text-sm" },
    lg: { title: "text-2xl", stat: "text-4xl", text: "text-lg", small: "text-base" }
  }[fontSize];




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

  if (loading && records.length === 0) {
    return <LoadingOverlay message="統計分析資料載入中..." />;
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <h3 className={`font-bold text-error mb-2 ${sizeMap.title}`}>儀表板載入失敗</h3>
        <p className={`text-error/80 ${sizeMap.text}`}>{error}</p>
        <button onClick={onRefresh} className={`mt-4 px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors ${sizeMap.text}`}>
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Period Filter Row */}
      <div className="flex bg-surface-container-high/80 backdrop-blur-md rounded-lg p-1.5 border border-outline-variant w-full md:w-fit mb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
         <button
            onClick={() => setFilterPeriod('current')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'current' ? 'bg-primary/20 text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
         >
            本期 {getPeriodLabel(0)}
         </button>
         <button
            onClick={() => setFilterPeriod('previous')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'previous' ? 'bg-secondary/20 text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
         >
            上期 {getPeriodLabel(-1)}
         </button>
         <button
            onClick={() => setFilterPeriod('year')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shrink-0 ${filterPeriod === 'year' ? 'bg-tertiary/20 text-tertiary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
         >
            本年度累計
         </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
         
         {/* Tax Payable Card */}
         <Card className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <TrendingUp className="w-24 h-24 text-primary" />
            </div>
            <div className="relative z-10 space-y-2">
               <h3 className={`font-semibold text-on-surface-variant flex items-center gap-2 ${sizeMap.text}`}>
                  <DollarSign className="w-5 h-5 text-primary" />
                  {filterPeriod === 'current' ? '本期' : filterPeriod === 'previous' ? '上期' : '本年度'}預估應納營業稅
               </h3>
               <div className="mt-2 flex items-baseline gap-2">
                  <span className={`font-mono font-bold tracking-tight ${isTaxFavorable ? 'text-secondary' : 'text-error'} ${sizeMap.stat}`}>
                     ${Math.abs(estimatedTaxPayable).toLocaleString()}
                  </span>
                  <span className={`text-on-surface-variant ${sizeMap.text}`}>
                     {estimatedTaxPayable > 0 ? '(應繳納)' : '(留抵/免繳)'}
                  </span>
               </div>
               <div className={`mt-4 pt-4 border-t border-outline-variant/60 grid grid-cols-2 gap-4 ${sizeMap.small}`}>
                  <div>
                     <p className="text-on-surface-variant mb-1">總銷項稅額</p>
                     <p className="text-on-surface font-mono">${outputTax.toLocaleString()}</p>
                  </div>
                  <div>
                     <p className="text-on-surface-variant mb-1">可扣抵進項</p>
                     <p className="text-on-surface font-mono">${deductibleInputTax.toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </Card>

         {/* AR/AP Summary Card */}
         <Card className={`p-6 relative overflow-hidden group ${overdueRecords.length > 0 ? 'border-error/30' : 'border-secondary/20'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Clock className={`w-24 h-24 ${overdueRecords.length > 0 ? 'text-error' : 'text-secondary'}`} />
            </div>
            <div className="relative z-10 space-y-2">
               <h3 className={`font-semibold text-on-surface-variant flex items-center gap-2 ${sizeMap.text}`}>
                  <AlertCircle className={`w-5 h-5 ${overdueRecords.length > 0 ? 'text-error' : 'text-secondary'}`} />
                  應收/應付帳款警示
               </h3>
               {overdueRecords.length > 0 ? (
                  <>
                     <div className="mt-2 flex items-baseline gap-2">
                        <span className={`font-mono font-bold tracking-tight text-error ${sizeMap.stat}`}>
                           {overdueRecords.length}
                        </span>
                        <span className={`text-on-surface-variant ${sizeMap.text}`}>筆已逾期</span>
                     </div>
                     <p className={`mt-4 pt-4 border-t border-outline-variant/60 text-on-surface-variant ${sizeMap.small}`}>
                        請盡速處理未結清之帳款，以維持現金流健康。
                     </p>
                  </>
               ) : (
                  <>
                     <div className="mt-2 flex items-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-secondary" />
                        <span className={`font-medium text-secondary ${sizeMap.text}`}>所有帳款皆已於期限內收付！</span>
                     </div>
                     <p className={`mt-4 pt-4 border-t border-outline-variant/60 text-on-surface-variant ${sizeMap.small}`}>
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
            <h3 className={`font-bold text-on-surface flex items-center gap-2 ${sizeMap.title}`}>
               <AlertCircle className="w-5 h-5 text-error" />
               逾期帳款明細
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {overdueRecords.map(record => (
                  <Card key={record.id} className="p-4 border border-error/40 bg-error-container/10 hover:border-error/50 transition-colors flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <span className={`px-2 py-0.5 rounded font-medium ${
                              record.type === '銷項 (收入)' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'
                           } ${sizeMap.small}`}>
                              {record.type === '銷項 (收入)' ? '應收款 (催收)' : '應付款 (待付)'}
                           </span>
                           <span className={`font-mono tracking-tight text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded ${sizeMap.small}`}>
                              {record.id}
                           </span>
                        </div>
                        <h4 className={`font-bold text-on-surface mb-1 ${sizeMap.text}`}>{record.category || '未分類'}</h4>
                        {record.note && <p className={`text-on-surface-variant mb-3 ${sizeMap.small}`}>{record.note}</p>}
                     </div>
                     
                     <div className="mt-3 pt-3 border-t border-outline-variant/50 flex justify-between items-end">
                        <div className="space-y-1">
                           <p className={`text-error/80 font-medium ${sizeMap.small}`}>
                              預計日：{record.expectedDate}
                           </p>
                           <p className={`font-mono font-bold tracking-tight text-on-surface ${sizeMap.title}`}>
                              ${Number(record.total).toLocaleString()}
                           </p>
                        </div>
                        <button
                           onClick={() => onNavigateToEdit(record)}
                           className={`px-3 py-1.5 bg-surface-container hover:bg-outline-variant text-primary rounded-lg transition-colors font-medium border border-outline ${sizeMap.small}`}
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
