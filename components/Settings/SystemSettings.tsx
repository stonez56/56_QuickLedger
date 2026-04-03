import React, { useState, useEffect } from 'react';
import { Card } from '../UI.tsx';
import { AppConfig, LedgerRecord } from '../../types.ts';
import { Save, Download, CloudOff, Cloud, RefreshCcw, AlertTriangle, Shield, HardDrive, List, FileClock } from 'lucide-react';

interface SystemSettingsProps {
  config: AppConfig;
  records: LedgerRecord[];
}

interface BackupFile {
  id: string;
  name: string;
  dateCreated: string;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ config, records }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Security Settings
  const [secret, setSecret] = useState(config.apiSecret); 
  const [usersStr, setUsersStr] = useState('');
  
  // Backup Management
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    fetchCurrentUsers();
  }, []);

  const fetchCurrentUsers = async () => {
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getConfig', secret: config.apiSecret }),
      });
      const result = await response.json();
      if (result.status === 'success' && result.users) {
        setUsersStr(result.users.join(', '));
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  const handleSaveSecurity = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'saveSystemSettings', 
          secret: config.apiSecret,
          data: {
             secret: secret.trim(),
             users: usersStr.trim()
          }
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setMessage({ type: 'success', text: '系統安全性設定已更新，請重新載入應用程式以套用。' });
      } else {
        setMessage({ type: 'error', text: result.message || '儲存失敗' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '連線錯誤: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) {
      setMessage({ type: 'error', text: '沒有資料可供下載' });
      return;
    }
    
    // Convert records to CSV
    const headers = ["流水號", "出入帳", "發票日", "收付款日", "預計日", "憑證種類", "格式代號", "發票號碼", "對方統編", "銷售額", "營業稅額", "總金額", "課稅別", "會計科目", "備註", "紀錄者"];
    const rows = records.map(r => [
      r.id, r.recordType, r.date, r.paymentDate, r.expectedDate,
      r.type, r.formatCode, r.invoiceNo, r.taxId,
      r.amount, r.tax, r.total, r.taxType,
      r.category, `"${(r.note || '').replace(/"/g, '""')}"`, r.userEmail
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Add BOM for Excel UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `QuickLedger_LocalBackup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setMessage({ type: 'success', text: '本機備份 (CSV) 已成功下載！' });
  };

  const handleCloudBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'backupData', secret: config.apiSecret }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setMessage({ type: 'success', text: result.message });
        fetchBackups(); // refresh list
      } else {
        setMessage({ type: 'error', text: result.message || '雲端備份失敗' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '連線錯誤: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'listBackups', secret: config.apiSecret }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setBackups(result.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch backups', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestore = async (backupId: string, backupName: string) => {
    const confirmMsg = `警告：這將會使用 [${backupName}] 覆寫目前的資料表！\n而且會導致所有未備份的新增資料遺失！\n\n系統會在還原前自動建立一份「Fail-Safe」備份，但您確定要繼續嗎？`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setMessage({ type: 'success', text: '正在準備還原... (此過程包含建立防呆備份與資料覆寫，請耐心等候)' });
    
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'restoreData', secret: config.apiSecret, backupFileId: backupId }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setMessage({ type: 'success', text: '資料已成功還原！請重新整理網頁以載入最新資料。' });
      } else {
        setMessage({ type: 'error', text: result.message || '還原失敗' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '連線錯誤: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {message && (
        <div className={`p-4 rounded-xl flex items-start ${message.type === 'error' ? 'bg-error/10 text-error border border-error/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
          {message.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-3 shrink-0" /> : <Shield className="w-5 h-5 mr-3 shrink-0" />}
          <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Security Settings Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-on-primary-container" />
            <h2 className="text-xl font-bold text-on-surface">系統安全性與權限</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">API Secret (登入密碼)</label>
              <input
                type="text"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                className="w-full bg-surface-container-high border border-outline text-on-surface rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="輸入新的登入密碼"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">允許登入的 Google 信箱 (以逗號分隔)</label>
              <textarea
                value={usersStr}
                onChange={e => setUsersStr(e.target.value)}
                rows={3}
                className="w-full bg-surface-container-high border border-outline text-on-surface rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="user1@gmail.com, user2@google.com"
              />
              <p className="text-xs text-on-surface-variant mt-2">只有列在此處的信箱，在通過 Secret 驗證後才能寫入資料。</p>
            </div>

            <button
              onClick={handleSaveSecurity}
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 bg-primary-container hover:bg-indigo-600 text-on-surface rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              {loading ? '儲存中...' : '儲存安全性設定'}
            </button>
          </div>
        </Card>

        {/* Local Backup Section */}
        <Card className="p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <HardDrive className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-on-surface">本機備份 (Local Backup)</h2>
          </div>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            立即將目前所有的總帳資料匯出為 CSV 格式下載至您的電腦。此作法適合進行離線數據分析或當作實體備份妥善保管。
          </p>
          <button
             onClick={handleDownloadCSV}
             className="w-full flex items-center justify-center py-2.5 px-4 bg-surface-container hover:bg-outline-variant border border-outline text-primary rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            下載 CSV 備份
          </button>
        </Card>
      </div>

      {/* Cloud Backup & Restore Section */}
      <Card className="p-6">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <Cloud className="w-6 h-6 text-teal-400" />
               <h2 className="text-xl font-bold text-on-surface">雲端備份與還原 (Google Drive)</h2>
            </div>
            
            <button
               onClick={handleCloudBackup}
               disabled={loading}
               className="flex items-center py-2 px-4 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/50 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
            >
               {loading ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
               立即建立雲端備份
            </button>
         </div>

         <p className="text-sm text-on-surface-variant mb-6 leading-relaxed bg-surface-container-high/50 p-4 rounded-lg border border-outline-variant">
            雲端備份檔案會儲存在您的 Google Drive <code className="text-teal-400 bg-teal-400/10 px-1 py-0.5 rounded">_Backups_QuickLedger</code> 資料夾中。
            系統預設每日自動備份，並最多保留最近的 30 份副本。若執行「還原」，系統會先自動建立一份防呆備份再進行覆寫。
         </p>

         <div className="mt-8 border-t border-outline-variant pt-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                 <List className="w-5 h-5 text-on-surface-variant" />
                 可用的雲端備份列表
               </h3>
               <button onClick={fetchBackups} className="text-sm text-on-surface-variant hover:text-on-surface transition-colors flex items-center">
                 <RefreshCcw className={`w-4 h-4 mr-1 ${loadingBackups ? 'animate-spin' : ''}`} />
                 更新列表
               </button>
            </div>

            {loadingBackups ? (
               <div className="py-8 text-center text-on-surface-variant">讀取中...</div>
            ) : backups.length === 0 ? (
               <div className="py-8 text-center text-on-surface-variant bg-surface-container-high/30 rounded-lg border border-dashed border-outline-variant">
                  <CloudOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  目前沒有任何備份檔案
               </div>
            ) : (
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {backups.map(b => (
                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-high/50 hover:bg-surface-container/80 border border-outline-variant rounded-lg transition-colors gap-4">
                       <div className="flex items-start gap-3 overflow-hidden">
                          <FileClock className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                          <div className="min-w-0">
                             <p className="font-medium text-on-surface truncate" title={b.name}>{b.name}</p>
                             <p className="text-xs text-on-surface-variant mt-1">建立時間: {b.dateCreated}</p>
                          </div>
                       </div>
                       <button
                          onClick={() => handleRestore(b.id, b.name)}
                          disabled={loading}
                          className="shrink-0 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded font-medium text-sm transition-colors disabled:opacity-50"
                       >
                         還原此備份
                       </button>
                    </div>
                 ))}
               </div>
            )}
         </div>
      </Card>
    </div>
  );
};
