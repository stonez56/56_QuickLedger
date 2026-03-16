import React, { useState, useEffect } from 'react';
import { Key, Mail, ShieldCheck, WifiOff, CheckSquare, HelpCircle, Eye, EyeOff, AlertTriangle, CheckCircle2, Terminal } from 'lucide-react';
import { AppConfig } from '../types.ts';
import { Card, Input, Button } from './UI.tsx';
import { APPS_SCRIPT_URL } from '../constants.ts';

interface AuthFormProps {
  onLogin: (config: AppConfig) => void;
}

const CACHE_KEY = 'auth_form_preference';

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<{ text: string; detail?: React.ReactNode; isDeployError?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { mail, secret: savedSecret, remember } = JSON.parse(cached);
        if (remember) {
          if (mail) setEmail(mail);
          if (savedSecret) setSecret(savedSecret);
          setRememberMe(true);
        }
      } catch (e) {
        // Ignore parse error
      }
    }
  }, []);

  const verifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !secret) {
      setError({ text: '請填寫所有欄位' });
      setLoading(false);
      return;
    }

    try {
      const payload = { action: 'getConfig', secret: secret.trim() };
      
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      
      if (!response.ok) {
        throw new Error(`伺服器回應錯誤: ${response.status}`);
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("Apps Script 回傳非 JSON 格式 (可能權限不足)");
      }
      
      if (result.status === 'success') {
        const allowedUsers = result.users || [];
        // If allowedUsers array is empty, it means no restriction is set in Config B2
        if (allowedUsers.length > 0 && !allowedUsers.includes(email.trim().toLowerCase())) {
          setError({ text: `權限錯誤`, detail: `使用者 '${email}' 不在允許名單中。請檢查 Config 分頁。` });
        } else {
          // Handle Remember Me caching (Email AND Secret for testing convenience)
          if (rememberMe) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              mail: email.trim(),
              secret: secret.trim(),
              remember: true
            }));
          } else {
            localStorage.removeItem(CACHE_KEY);
          }

          onLogin({
            userEmail: email.trim(),
            apiSecret: secret.trim(),
            scriptUrl: APPS_SCRIPT_URL,
          });
        }
      } else {
        // Check for specific script permission errors returned by the backend
        const msg = result.message || '';
        if (msg.includes('權限') || msg.includes('permission') || msg.includes('getActiveSpreadsheet')) {
           setError({
             text: '腳本未授權 (Permission Missing)',
             isDeployError: true,
             detail: (
                <div className="space-y-3 mt-2 text-xs text-rose-200 bg-rose-900/40 p-3 rounded border border-rose-500/30">
                   <div className="flex items-start gap-2">
                     <Terminal className="w-5 h-5 shrink-0 text-amber-400" />
                     <p className="font-bold text-amber-100">需要手動執行一次授權：</p>
                   </div>
                   <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-300">
                     <li>回到 <strong>Google Apps Script 編輯器</strong>。</li>
                     <li>
                        在上方工具列的函式選單中，選擇 <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">setup</code> 並點擊 <strong>「執行 (Run)」</strong>。
                     </li>
                     <li>
                        <strong>若無跳出視窗：</strong>請看下方「執行記錄」。若顯示「執行完畢」，代表已經有權限了。
                     </li>
                     <li>
                        <strong className="text-amber-300">關鍵步驟：</strong>點擊右上角「部署」→「管理部署作業」→ 點擊筆圖示 → <strong className="text-white underline">版本必須選「新版本」</strong> → 部署。
                     </li>
                     <li>
                        完成後，再次點擊下方的「驗證並登入」。
                     </li>
                   </ol>
                </div>
             )
           });
        } else {
           setError({ text: '驗證失敗', detail: msg });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let errorMsg = err.message;
      let errorDetail: React.ReactNode = null;
      let isDeployError = false;

      // Detect CORS or Network Errors (Deployment Issues)
      if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError") || errorMsg.includes("JSON")) {
        errorMsg = "連線失敗 (Deployment Error)";
        isDeployError = true;
        errorDetail = (
          <div className="space-y-3 mt-2 text-xs text-rose-200 bg-rose-900/40 p-3 rounded border border-rose-500/30">
             <div className="flex items-start gap-2">
               <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
               <p className="font-bold text-amber-100">請按照順序檢查 Apps Script 設定：</p>
             </div>
             <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-300">
               <li>
                 <span className="text-white font-semibold">授權權限：</span>
                 <br/>
                 <span className="pl-4 block text-slate-400">執行 <code className="text-sky-300">setup</code> 函式。若無跳窗且顯示執行完畢，即代表成功。</span>
               </li>
               <li>
                 <span className="text-white font-semibold">部署設定：</span>
                 <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                   <li>執行身分 (Execute as): <strong className="text-sky-300">Me (我)</strong></li>
                   <li>存取權限 (Access): <strong className="text-sky-300">Anyone (任何人)</strong></li>
                 </ul>
               </li>
               <li>
                 <span className="text-white font-semibold">更新版本 (最常見遺漏)：</span>
                 <br/>
                 <span className="pl-4 block text-slate-400">務必建立 <strong>「New version (新版本)」</strong> 並按部署，設定才會生效。</span>
               </li>
             </ol>
          </div>
        );
      } else if (errorMsg.includes("Invalid Secret")) {
         errorDetail = (
           <div className="space-y-1 mt-1 text-xs text-rose-300/90">
             <p className="font-bold">密鑰錯誤常見原因：</p>
             <ul className="list-disc list-inside">
               <li>確認 Google Sheet「Config」分頁 B1 儲存格內容無誤。</li>
               <li><strong>注意：</strong>若此試算表是複製來的，Apps Script 可能仍指向舊的檔案 ID。</li>
               <li>請檢查 Script 程式碼是否使用 <code>getActiveSpreadsheet()</code>。</li>
             </ul>
           </div>
         );
      }
      
      setError({ text: errorMsg, detail: errorDetail, isDeployError });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className={`w-full transition-all duration-300 ${error?.isDeployError ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-sky-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">One-Person Accounting</h1>
          <p className="text-slate-400 mt-2 text-sm">一人公司記帳系統 v2026</p>
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={verifyAndLogin} className="space-y-5">
            <Input
              id="email"
              label="電子信箱 (User Email)"
              type="email"
              placeholder="your-email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <div>
                <Input
                  id="secret"
                  label="API 密鑰 (Secret)"
                  type={showSecret ? "text" : "password"}
                  placeholder="請輸入 Config 分頁設定的 Secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  icon={Key}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                      tabIndex={-1}
                    >
                      {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                <div className="mt-2 flex items-start gap-2 text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        <span className="opacity-70 mt-1 block">Check Google Sheet!</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <div className="relative flex items-center">
                    <input
                        id="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-900 checked:border-sky-500 checked:bg-sky-500 transition-all"
                    />
                    <CheckSquare className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer select-none hover:text-slate-300">
                    記住帳號與密鑰 (Auto-Fill)
                </label>
            </div>

            {error && (
               <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm flex flex-col animate-in slide-in-from-top-2 fade-in">
                <div className="flex items-center font-bold">
                    <WifiOff className="w-4 h-4 mr-2" />
                    {error.text}
                </div>
                {error.detail && <div className="mt-1 w-full">{error.detail}</div>}
              </div>
            )}

            <Button type="submit" className="w-full py-3" isLoading={loading}>
              驗證並登入
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};