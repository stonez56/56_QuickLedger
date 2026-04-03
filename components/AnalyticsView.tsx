import React, { useState, useMemo } from 'react';
import { LedgerRecord } from '../types.ts';
import { Card } from './UI.tsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface AnalyticsViewProps {
  records: LedgerRecord[];
  fontSize: 'sm' | 'base' | 'lg';
}

type ChartPeriod = 'monthly' | 'bimonthly' | 'quarterly' | 'annually';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records, fontSize }) => {
  const [period, setPeriod] = useState<ChartPeriod>('bimonthly');
  const [activeFocusKey, setActiveFocusKey] = useState<string | null>(null);

  const sizeMap = {
    sm: { title: "text-lg", text: "text-sm", small: "text-xs" },
    base: { title: "text-xl", text: "text-base", small: "text-sm" },
    lg: { title: "text-2xl", text: "text-lg", small: "text-base" }
  }[fontSize];

  const processedData = useMemo(() => {
    const groups: Record<string, { income: number, expense: number, name: string, sortKey: string }> = {};
    const categories: Record<string, number> = {};

    records.forEach(r => {
      const amt = Number(r.total) || 0;
      if (amt === 0) return;

      const date = new Date(r.date);
      if (isNaN(date.getTime())) return;

      if (r.type === '進項 (支出)') {
        const cat = r.category || '未分類';
        categories[cat] = (categories[cat] || 0) + amt;
      }

      const y = date.getFullYear();
      const m = date.getMonth(); 
      let key = '';
      let label = '';

      if (period === 'monthly') {
        key = `${y}-${String(m + 1).padStart(2, '0')}`;
        label = `${m + 1}月`;
      } else if (period === 'bimonthly') {
        const bm = Math.floor(m / 2);
        key = `${y}-B${bm}`;
        label = `${bm * 2 + 1}-${bm * 2 + 2}月`;
      } else if (period === 'quarterly') {
        const q = Math.floor(m / 3) + 1;
        key = `${y}-Q${q}`;
        label = `Q${q}`;
      } else if (period === 'annually') {
        key = `${y}`;
        label = `${y}年`;
      }

      if (!groups[key]) {
        groups[key] = { name: label, income: 0, expense: 0, sortKey: key };
      }

      if (r.type === '銷項 (收入)') {
        groups[key].income += amt;
      } else if (r.type === '進項 (支出)') {
        groups[key].expense += amt;
        
        // Only add to Pie Chart categories if no focus is set OR focus matches this record's period key
        if (!activeFocusKey || activeFocusKey === key) {
            const cat = r.category || '未分類';
            categories[cat] = (categories[cat] || 0) + amt;
        }
      }
    });

    const barData = Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    // Top 5 Categories Pie Chart
    const pieData = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { barData, pieData };
  }, [records, period]);

  const COLORS = ['#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239'];

  return (
    <div className="space-y-4 mt-8 pt-6 border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className={`font-bold text-on-surface flex items-center gap-2 ${sizeMap.title}`}>
          <BarChart3 className="w-6 h-6 text-on-primary-container" />
          經營損益分析
        </h3>
        
        <div className="flex bg-surface-container-high/80 rounded-lg p-1 border border-outline-variant w-full md:w-auto overflow-x-auto hide-scrollbar">
          <button
            onClick={() => { setPeriod('monthly'); setActiveFocusKey(null); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${period === 'monthly' ? 'bg-primary-container/20 text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >月度</button>
          <button
            onClick={() => { setPeriod('bimonthly'); setActiveFocusKey(null); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${period === 'bimonthly' ? 'bg-primary-container/20 text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >雙月 (營業稅)</button>
          <button
            onClick={() => { setPeriod('quarterly'); setActiveFocusKey(null); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${period === 'quarterly' ? 'bg-primary-container/20 text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >季度</button>
          <button
            onClick={() => { setPeriod('annually'); setActiveFocusKey(null); }}
            className={`px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${period === 'annually' ? 'bg-primary-container/20 text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >年度</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-4">
          <h4 className={`text-on-surface-variant mb-6 font-medium ${sizeMap.text}`}>收支現金流趨勢 (總額)</h4>
          <div className="h-64 w-full">
            {processedData.barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData.barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#1e293b'}} 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                      formatter={(value: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value)}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                    <Bar 
                       dataKey="income" 
                       name="總收入 (含稅+未稅)" 
                       fill="#34d399" 
                       radius={[4, 4, 0, 0]} 
                       maxBarSize={40} 
                       onClick={(data) => setActiveFocusKey(data.sortKey === activeFocusKey ? null : data.sortKey)}
                       cursor="pointer"
                    />
                    <Bar 
                       dataKey="expense" 
                       name="總支出 (含稅+未稅)" 
                       fill="#fb7185" 
                       radius={[4, 4, 0, 0]} 
                       maxBarSize={40} 
                       onClick={(data) => setActiveFocusKey(data.sortKey === activeFocusKey ? null : data.sortKey)}
                       cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">此期間無收支紀錄</div>
            )}
          </div>
        </Card>

        <Card className="p-4 relative md:hidden">
          <h4 className={`text-on-surface-variant font-medium flex items-center gap-2 ${sizeMap.text}`}>
            <PieChartIcon className="w-4 h-4 text-error" />
            TOP 5 支出結構 ({activeFocusKey ? processedData.barData.find(d => d.sortKey === activeFocusKey)?.name : '全期'})
          </h4>
          <p className="text-xs text-primary mt-1 mb-2">💡 點擊左側長條圖，可分析特定期間</p>
          <div className="h-64 w-full">
            {processedData.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {processedData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                    formatter={(value: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value)}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">無支出資料</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
