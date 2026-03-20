import React, { useState } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Button } from './UI.tsx';

interface Props {
  onClose: () => void;
}

export const HelpSettingsModal: React.FC<Props> = ({ onClose }) => {
  const [settingsTab, setSettingsTab] = useState<'both' | 'internal' | 'guide'>('both');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            系統說明與幫助
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            type="button"
            className={`px-4 py-3 text-sm font-medium transition-colors ${settingsTab === 'both' ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-950/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setSettingsTab('both')}
          >
            💡 內外帳說明
          </button>
          <button
            type="button"
            className={`px-4 py-3 text-sm font-medium transition-colors ${settingsTab === 'internal' ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-950/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setSettingsTab('internal')}
          >
            📝 僅內帳說明
          </button>
          <button
            type="button"
            className={`px-4 py-3 text-sm font-medium transition-colors ${settingsTab === 'guide' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setSettingsTab('guide')}
          >
            📖 記帳需知
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-slate-300 overflow-y-auto">
          {settingsTab === 'both' && (
            <>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">選擇憑證分類</h4>
                  <p>選擇「內外帳 (含稅憑證)」，代表此筆帳目有合法憑證（如發票），可供報稅使用。若勾選「非應收應付」，系統會自動將發票日期帶入收付款日。</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">判斷可扣抵/不可扣抵</h4>
                  <p>進項發票的營業稅分為「可扣抵」與「不可扣抵」。<br/>
                  <span className="text-emerald-400">✅ 可扣抵：</span>與公司業務直接相關的支出（如進貨、辦公用品、設備）。<br/>
                  <span className="text-rose-400">❌ 不可扣抵：</span>交際費、伙食費、職工福利、自用乘人小汽車等。系統會依據您選擇的會計科目給予提示。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">輸入金額明細</h4>
                  <p>您可以直接輸入「總金額」，系統會自動反推未稅額與稅金。或是輸入未稅額，系統也會自動計算總金額。</p>
                </div>
              </div>
            </>
          )}
          {settingsTab === 'internal' && (
            <>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">選擇憑證分類</h4>
                  <p>選擇「僅內帳 (無憑證/不報稅)」，代表此筆帳目僅供內部管理使用，通常是沒有合法發票的支出（如個人收據），或是不打算拿來報稅的項目。</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">格式代號與統編</h4>
                  <p>內帳通常不需要對方的統編。您可以在格式代號選擇「99 - 收據/其他 (無發票)」，此時「對方統編」欄位將變為非必填。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-white mb-1">輸入金額明細</h4>
                  <p>內帳通常不區分稅額，您可以直接輸入總金額即可。確認無誤後點擊「確認送出」即可完成記帳。</p>
                </div>
              </div>
            </>
          )}
          {settingsTab === 'guide' && (
            <>
              <div>
                <h4 className="font-bold text-emerald-400 text-base mb-3 border-b border-slate-800 pb-2">1. 收入 (Income)</h4>
                <div className="space-y-3">
                  <p><strong className="text-white">通常有發票：</strong> 如果您的公司是「核定使用統一發票」的營業人，只要銷售商品或提供勞務，就必須開立統一發票給客戶。</p>
                  <p><strong className="text-white">沒有發票的情況：</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">小規模營業人：</strong> 如果是國稅局核定的免用統一發票商號，則是開立「普通收據」。</li>
                    <li><strong className="text-slate-300">非營業收入：</strong> 例如銀行存款利息（憑證為銀行存摺紀錄）、政府補助款（核准公文與匯款紀錄）等，這些不會開立發票。</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-emerald-400 text-base mb-3 border-b border-slate-800 pb-2">2. 支出 (Expense)</h4>
                <div className="space-y-3">
                  <p>支出的憑證種類非常多，很多項目是沒有統一發票的：</p>
                  <p><strong className="text-white">有發票的支出：</strong> 向一般公司行號進貨、購買設備、水電費、電信費、交際費等。</p>
                  <p><strong className="text-white">沒有發票，但有其他合法憑證的支出：</strong></p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-400">
                    <li><strong className="text-slate-300">薪資/勞務費：</strong> 員工薪資單、兼職人員的勞務報酬單（勞報單）。</li>
                    <li><strong className="text-slate-300">小額採購：</strong> 向免用統一發票的店家購買物品，會取得「收據」（需蓋有免用統一發票專用章）。</li>
                    <li><strong className="text-slate-300">租金支出：</strong> 如果房東是個人，憑證會是「租賃契約」加上「匯款證明」或「簽收單」。</li>
                    <li><strong className="text-slate-300">差旅交通費：</strong> 高鐵/台鐵車票、機票票根與登機證、計程車收據。</li>
                    <li><strong className="text-slate-300">郵資/規費/稅金：</strong> 郵局的購票證明、政府機關的規費收據、繳稅的繳款書。</li>
                    <li><strong className="text-slate-300">銀行手續費：</strong> 銀行存摺的扣款紀錄或銀行開立的手續費收據。</li>
                    <li><strong className="text-slate-300">國外採購：</strong> 國外廠商開立的 Commercial Invoice（商業發票，這與台灣的統一發票不同）、海關的進口報單。</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-emerald-400 text-base mb-3 border-b border-slate-800 pb-2">3. 特殊稅務項目 (Special Tax Items)</h4>
                <div className="space-y-3">
                  <p><strong className="text-white">a. 進項折讓 (Input Return/Discount)：</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">何時使用：</strong> 當您向供應商進貨或購買費用後，發生「退貨」或「折讓（減價）」時使用。</li>
                    <li><strong className="text-slate-300">憑證：</strong> 您需要開立或取得「營業人銷貨退回進貨退出或折讓證明單」。</li>
                    <li><strong className="text-slate-300">系統操作：</strong> 在系統中選擇「23 - 進項折讓」，這會減少您的進項稅額（即減少可扣抵的稅額）。</li>
                  </ul>
                  <p><strong className="text-white">b. 海關代徵 (Customs Collection)：</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">何時使用：</strong> 當您從國外進口貨物時，海關會代為徵收營業稅。</li>
                    <li><strong className="text-slate-300">憑證：</strong> 您會取得海關核發的「海關進口貨物稅費繳納證兼匯款申請書」（通常稱為海關代徵營業稅繳款書）。</li>
                    <li><strong className="text-slate-300">系統操作：</strong> 在系統中選擇「28 - 海關代徵」，這筆代徵的營業稅可以作為您的進項稅額來扣抵銷項稅額。</li>
                  </ul>
                </div>
              </div>

              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                <h4 className="font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  在系統中該如何記錄？
                </h4>
                <p className="text-sky-200/80 leading-relaxed">
                  在我們開發的這套記帳系統中，當您在記錄時，如果遇到沒有台灣統一發票的支出或收入，您可以在「格式代號」中選擇 <strong className="text-sky-300">「99 - 收據/其他 (無發票)」</strong>，並在備註欄位註明實際的憑證種類（例如：薪資單、高鐵車票），這樣就能確保帳務清晰且符合規範了！
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end shrink-0">
          <Button onClick={onClose}>
            我瞭解了
          </Button>
        </div>
      </div>
    </div>
  );
};
