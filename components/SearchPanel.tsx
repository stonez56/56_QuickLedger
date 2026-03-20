import React, { useState } from 'react';
import { Search, Calendar, Edit, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppConfig, LedgerRecord } from '../types.ts';
import { Card, Input, Button } from './UI.tsx';

interface SearchPanelProps {
  config: AppConfig;
  onEdit: (record: LedgerRecord) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ config, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'keyword' | 'date'>('keyword');
  const [query, setQuery] = useState('');

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(today));
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LedgerRecord[]>([]);
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      action: 'search',
      secret: config.apiSecret,
      type: activeTab,
      query: activeTab === 'keyword' ? query : undefined,
      startDate: activeTab === 'date' ? startDate : undefined,
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
        setResults(res.data || []);
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
         setResults(prev => prev.filter(r => r.id !== record.id));
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
                {message.type === 'error' ? <AlertTriangle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                {message.text}
             </div>
          )}
        </form>
      </Card>

      <div className="space-y-4">
        {results.map((record) => (
          <Card key={record.id} className="p-4 hover:border-sky-500/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
               <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                     <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{record.id}</span>
                     <span className={`text-xs px-2 py-0.5 rounded ${record.type === '進項 (支出)' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                       {record.type}
                     </span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-lg mt-2">{record.category || '未分類'}</h4>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>發票: {record.date || '--'}</span>
                    {record.paymentDate && <span>• 收付: {record.paymentDate}</span>}
                  </div>
               </div>
               <div className="text-right">
                  <div className={`text-xl font-bold font-mono tracking-tight ${record.type === '進項 (支出)' ? 'text-rose-400' : 'text-emerald-400'}`}>
                     ${Number(record.total).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">稅額: ${Number(record.tax).toLocaleString()}</div>
               </div>
            </div>
            
            {(record.note || record.invoiceNo || record.taxId) && (
               <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 mt-3 text-sm flex flex-col gap-1">
                 {record.note && <p className="text-slate-300">{record.note}</p>}
                 {record.invoiceNo && <p className="text-slate-500 text-xs">發票號碼: <span className="font-mono text-slate-400">{record.invoiceNo}</span></p>}
                 {record.taxId && <p className="text-slate-500 text-xs">統編: <span className="font-mono text-slate-400">{record.taxId}</span></p>}
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
          </Card>
        ))}
      </div>
    </div>
  );
};
