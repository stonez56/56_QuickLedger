import React, { useState } from 'react';
import { Search, Calendar, Edit, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppConfig, LedgerRecord } from '../types.ts';
import { Card, Input, Button } from './UI.tsx';
import { getTaiwanDateString } from '../utils/date.ts';

interface SearchPanelProps {
  config: AppConfig;
  onEdit: (record: LedgerRecord) => void;
  fontSize: 'sm' | 'base' | 'lg';
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ config, onEdit, fontSize }) => {
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
        <div className="flex bg-surface-container-high rounded-lg p-1 border border-outline-variant mb-6 w-full max-w-sm mx-auto">
            <button
                type="button"
                onClick={() => setActiveTab('keyword')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'keyword' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'}`}
            >
                關鍵字查詢
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'date' ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant'}`}
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
             <div className={`p-3 rounded-lg flex items-center text-sm mt-4 ${message.type === 'error' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                {message.type === 'error' ? <AlertTriangle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                {message.text}
             </div>
          )}
        </form>
      </Card>

      <div className="space-y-4">
        {results.map((record) => (
          <Card key={record.id} className="p-4 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-2">
               <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                     <span className={`${sizeMap.id} font-mono text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded border border-outline`}>{record.id}</span>
                     <span className={`${sizeMap.type} px-2 py-0.5 rounded ${record.type === '進項 (支出)' ? 'bg-error/10 text-error border border-error/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                       {record.type}
                     </span>
                  </div>
                  <h4 className={`font-bold text-on-surface mt-2 ${sizeMap.category}`}>{record.category || '未分類'}</h4>
                  <div className={`${sizeMap.meta} text-on-surface-variant mt-1 flex items-center gap-2`}>
                    <span>發票: {record.date || '--'}</span>
                    {record.paymentDate && <span>• 收付: {record.paymentDate}</span>}
                  </div>
               </div>
               <div className="text-right">
                  <div className={`${sizeMap.amount} font-bold font-mono tracking-tight ${record.type === '進項 (支出)' ? 'text-error' : 'text-secondary'}`}>
                     ${Number(record.total).toLocaleString()}
                  </div>
                  <div className={`${sizeMap.tax} text-on-surface-variant`}>稅額: ${Number(record.tax).toLocaleString()}</div>
               </div>
            </div>
            
            {(record.note || record.invoiceNo || record.taxId) && (
               <div className="bg-surface-container-high/50 p-3 rounded-lg border border-outline-variant/50 mt-3 flex flex-col gap-1">
                 {record.note && <p className={`text-on-surface font-medium ${sizeMap.note}`}>{record.note}</p>}
                 {record.invoiceNo && <p className={`text-on-surface-variant ${sizeMap.meta}`}>發票號碼: <span className="font-mono text-on-surface-variant">{record.invoiceNo}</span></p>}
                 {record.taxId && <p className={`text-on-surface-variant ${sizeMap.meta}`}>統編: <span className="font-mono text-on-surface-variant">{record.taxId}</span></p>}
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-outline-variant/50">
               <Button variant="ghost" size="sm" className="h-8 px-4 text-primary bg-primary/10 hover:bg-primary/20" onClick={() => onEdit(record)}>
                  <Edit className="w-4 h-4 mr-1.5" />
                  編輯修改
               </Button>
               <Button variant="ghost" size="sm" className="h-8 px-4 text-error bg-error/10 hover:bg-error/20" onClick={() => handleDelete(record)}>
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
