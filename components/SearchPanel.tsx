import React, { useState } from 'react';
import { Search, Calendar, Edit, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppConfig, LedgerRecord } from '../types.ts';
import { Card, Input, Button } from './UI.tsx';
import { getTaiwanDateString } from '../utils/date.ts';

interface SearchPanelProps {
  config: AppConfig;
  onEdit: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
  lastEditedId?: string | null;
  scrollTargetId?: string | null;
  refreshTrigger?: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ config, onEdit, fontSize, lastEditedId, scrollTargetId, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'keyword' | 'date'>('keyword');
  const [query, setQuery] = useState('');

  const sizeMap = {
    sm: {
      id: "text-xs", type: "text-xs", category: "text-lg", meta: "text-xs", amount: "text-xl", tax: "text-xs", note: "text-sm",
    },
    base: {
      id: "text-sm", type: "text-sm", category: "text-xl", meta: "text-sm", amount: "text-2xl", tax: "text-sm", note: "text-base",
    },
    lg: {
      id: "text-base", type: "text-base", category: "text-2xl", meta: "text-base", amount: "text-3xl", tax: "text-base", note: "text-lg",
    }
  }[fontSize];

  // Use standardized UTC+8 dates
  const todayStr = getTaiwanDateString();
  const [yyyy, mm] = todayStr.split('-');
  const firstDayStr = `${yyyy}-${mm}-01`;

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<LedgerRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(config.recordsPerPage || 20);
  const [sortConfig, setSortConfig] = useState<{key: 'date'|'total', direction?: 'asc'|'desc'}>({key: 'date', direction: 'desc'});
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const sortedResults = React.useMemo(() => {
     let sortableItems = [...rawResults];
     if (sortConfig.direction !== undefined) {
         sortableItems.sort((a, b) => {
            if (sortConfig.key === 'date') {
               const valA = new Date(a.date).getTime() || 0;
               const valB = new Date(b.date).getTime() || 0;
               return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            } else if (sortConfig.key === 'total') {
               const valA = Number(a.total) || 0;
               const valB = Number(b.total) || 0;
               return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
         });
     }
     return sortableItems;
  }, [rawResults, sortConfig]);

  const results = sortedResults.slice(0, visibleCount);

  const performSearch = async () => {
    setLoading(true);
    setMessage(null);

    let finalStart = startDate;
    if (activeTab === 'date') {
      const dEnd = new Date(endDate);
      const dStart = new Date(startDate);
      const diffDays = (dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24);
      const limitDays = config.maxDateRange || 60;
      if (diffDays > limitDays) {
         const newStartDate = new Date(dEnd.getTime() - limitDays * 24 * 3600 * 1000);
         finalStart = newStartDate.toISOString().split('T')[0];
         setStartDate(finalStart); // Auto-update UI
         
         // Make the input blink or visually emphasize it updated
         const el = document.getElementById('startDate');
         if (el) {
            el.classList.add('ring-2', 'ring-emerald-500');
            setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500'), 2000);
         }
         
         setMessage({ type: 'success', text: `已自動將「開始日期」調整為 ${finalStart} (限制為 ${limitDays} 天內)以確保效能。` });
      }
    }
    
    if (activeTab === 'keyword' && !query.trim()) {
       setMessage({ type: 'error', text: '請輸入關鍵字以利查詢，避免消耗過多系統資源。' });
       setLoading(false);
       return;
    }

    const payload = {
      action: 'search',
      secret: config.apiSecret,
      type: activeTab,
      query: activeTab === 'keyword' ? query : undefined,
      startDate: activeTab === 'date' ? finalStart : undefined,
      endDate: activeTab === 'date' ? endDate : undefined,
    };

    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      const res = await response.json();
      if (res.status === 'success') {
        setRawResults(res.data || []);
        setVisibleCount(config.recordsPerPage || 20);
        if (res.data.length === 0) {
           setMessage({ type: 'success', text: '查無資料' });
        }
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '連線錯誤' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  React.useEffect(() => {
    if (scrollTargetId && rawResults.some(r => r.id === scrollTargetId)) {
      const el = document.getElementById(`record-${scrollTargetId}`);
      if (el) {
        setTimeout(() => {
           el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100); 
      }
    }
  }, [scrollTargetId, rawResults]);

  const handleDelete = async (record: LedgerRecord) => {
    if (!window.confirm(`確定要刪除流水號 ${record.id} 嗎？此動作無法復原。`)) return;

    setLoading(true);
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
           action: 'delete',
           secret: config.apiSecret,
           id: record.id
        })
      });
      const res = await response.json();
      if (res.status === 'success') {
         sessionStorage.removeItem('dashboard_records_cache'); // Invalidate stats cache on delete
         setRawResults(prev => prev.filter(r => r.id !== record.id));
         setMessage({ type: 'success', text: '刪除成功' });
      } else {
         throw new Error(res.message);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '刪除失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <Card className="p-6">
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 mb-6 w-full max-w-sm mx-auto">
            <button
                type="button"
                onClick={() => setActiveTab('keyword')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'keyword' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500'}`}
            >
                關鍵字查詢
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'date' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}
            >
                日期區間
            </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {activeTab === 'keyword' ? (
            <Input
              id="searchKeyword"
              name="searchKeyword"
              label="搜尋關鍵字"
              placeholder="科目、備註、統一編號..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={Search}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                label="開始日期"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={Calendar}
              />
              <Input
                id="endDate"
                name="endDate"
                type="date"
                label="結束日期"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                icon={Calendar}
              />
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={loading} icon={Search}>
            搜尋紀錄
          </Button>

          {message && (
             <div className={`p-3 rounded-lg flex items-center text-sm mt-4 ${message.type === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {message.type === 'error' ? <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 shrink-0" />}
                {message.text}
             </div>
          )}
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
           <span className="text-sm font-medium text-slate-400 mr-1 shrink-0">排列條件：</span>
           <button 
             onClick={() => setSortConfig({ key: 'date', direction: sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })} 
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${sortConfig.key==='date' ? 'bg-sky-500 text-white ring-2 ring-sky-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             disabled={rawResults.length === 0}
           >
              依日期 {sortConfig.key==='date' ? (sortConfig.direction==='desc'?'↓':'↑') : ''}
           </button>
           <button 
             onClick={() => setSortConfig({ key: 'total', direction: sortConfig.key === 'total' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })} 
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${sortConfig.key==='total' ? 'bg-sky-500 text-white ring-2 ring-sky-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             disabled={rawResults.length === 0}
           >
              依金額 {sortConfig.key==='total' ? (sortConfig.direction==='desc'?'↓':'↑') : ''}
           </button>
        </div>
        <span className="text-sm font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800/50">
           比對出 <span className="text-sky-400 font-bold">{rawResults.length}</span> 筆
        </span>
      </div>
      
      <div className="space-y-4">
        {results.map((record) => (
          <div 
            id={`record-${record.id}`}
            key={record.id} 
            className={`p-4 rounded-xl shadow-xl transition-all duration-700 relative overflow-hidden ${
              lastEditedId === record.id 
                ? 'border-[2px] border-sky-400 shadow-[0_0px_20px_rgba(14,165,233,0.4)] bg-sky-900/40' 
                : 'border border-slate-800 bg-slate-900 hover:border-sky-500/30'
            }`}
          >
            {lastEditedId === record.id && (
              <div className="absolute bottom-4 left-4 bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center">
                已更新
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
               <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                     <span className={`${sizeMap.id} font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700`}>{record.id}</span>
                     <span className={`${sizeMap.type} px-2 py-0.5 rounded ${record.type === '進項 (支出)' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                       {record.type}
                     </span>
                  </div>
                  <h4 className={`font-bold text-slate-200 mt-2 ${sizeMap.category}`}>{record.category || '未分類'}</h4>
                  <div className={`${sizeMap.meta} text-slate-500 mt-1 flex items-center gap-2`}>
                    <span>發票: {record.date || '--'}</span>
                    {record.paymentDate && <span>• 收付: {record.paymentDate}</span>}
                  </div>
               </div>
               <div className="text-right">
                  <div className={`${sizeMap.amount} font-bold font-mono tracking-tight ${record.type === '進項 (支出)' ? 'text-rose-400' : 'text-emerald-400'}`}>
                     ${Number(record.total).toLocaleString()}
                  </div>
                  <div className={`${sizeMap.tax} text-slate-500`}>稅額: ${Number(record.tax).toLocaleString()}</div>
               </div>
            </div>
            
            {(record.note || record.invoiceNo || record.taxId) && (
               <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 mt-3 flex flex-col gap-1">
                 {record.note && <p className={`text-slate-300 font-medium ${sizeMap.note}`}>{record.note}</p>}
                 {record.invoiceNo && <p className={`text-slate-500 ${sizeMap.meta}`}>發票號碼: <span className="font-mono text-slate-400">{record.invoiceNo}</span></p>}
                 {record.taxId && <p className={`text-slate-500 ${sizeMap.meta}`}>統編: <span className="font-mono text-slate-400">{record.taxId}</span></p>}
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-800/50">
               <Button variant="ghost" size="sm" className="h-8 px-4 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20" onClick={() => onEdit(record)}>
                  <Edit className="w-4 h-4 mr-1.5" />
                  編輯修改
               </Button>
               <Button variant="ghost" size="sm" className="h-8 px-4 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20" onClick={() => handleDelete(record)}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  刪除
               </Button>
            </div>
          </div>
        ))}
        {visibleCount < rawResults.length && (
            <button 
              onClick={() => setVisibleCount(c => c + (config.recordsPerPage || 20))} 
              className="w-full py-3 mt-8 bg-slate-900/50 hover:bg-slate-800 border-2 border-dashed border-slate-700 text-sky-400 font-medium rounded-xl transition-all"
            >
               載入更多紀錄 ({Math.min(visibleCount, rawResults.length)} / {rawResults.length})
            </button>
        )}
      </div>
    </div>
  );
};
