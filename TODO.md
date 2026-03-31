👨‍💼 資深會計師 (Senior Accountant) 結合系統架構的專業回覆：

處理「虛擬帳號收款 ＋ 第三方電子發票平台」的整批入帳作業，是所有擁有多學員、多訂單的企業最常遇到的痛點。

如果處理不當，很容易發生「銀行對帳單入帳一次，發票又入帳一次，導致收入多報被國稅局多課稅」的悲劇。或者面臨對帳單上找不到發票號碼、發票系統裡找不到匯款帳號的「對帳地獄」。

以下是我為您規劃的 「最優化數位記帳 SOP 與 QuickLedger 擴充方案」，這套流程能確保帳務 100% 精準且符合稅法。

👑 核心思維：以「發票」為入帳主體，而非「銀行對帳單」
在稅務實務上，國稅局查核收入的核心是**「統一發票」**。因此，不管是 10 個還是 100 個學生匯款，我們「不要」直接把銀行的 Excel 匯入 QuickLedger（因為銀行 Excel 沒有發票號碼，直接匯入會導致帳務殘缺）。

最佳的實務流水線 (Pipeline) 應該是這樣：

對帳 (Reconciliation): 拿銀行的「虛擬帳號入帳 Excel」去您的學生名單打勾，確認誰付了錢。
開發票 (Invoicing): 上傳已經付費的名單到「第三方電子發票系統」（如綠界、藍新、ezPay 等），系統會自動整批開立電子發票給這 10 位學生。
產出最終數據 (Export): 從「第三方發票系統」中，匯出當日已開立發票的 Excel / CSV 報表。這份報表通常非常乾淨，直接包含了：發票日期、發票號碼、金額 (含稅/未稅)、買受人統編 等完美對應 QuickLedger 的欄位！
📍 匯入 QuickLedger (Import): 將這份第三方發票平台產出的 Excel 餵給我們的 QuickLedger。
💻 QuickLedger 「批次匯入功能」開發計畫 (Solid Plan)
順著上述的商業邏輯，我建議我們未來在 QuickLedger 新增的 「Excel 批次匯入」 功能，可以依照以下計畫來打造：

Phase 1: 前端解析與對應 (Frontend Mapping)
我們會在畫面上新增一個「📥 批次匯入銷項發票 (CSV/Excel)」功能。
使用者上傳第三方平台給您的 Excel 檔後。
系統會彈出一個**「欄位對應 (Column Mapping)」**介面。例如：您告訴系統，Excel 的 A 欄是「發票號碼」，B 欄是「日期」，C 欄是「總金額」。不管是哪家第三方系統的格式，只要手動對應一次就能讀懂。
Phase 2: 自動補齊會計欄位 (Auto-fill Logic)
既然是整批匯入學費收入，系統會自動對這 10 筆資料套用預設的營業稅與會計邏輯：
進銷別： 自動全押 銷項 (收入)
格式代號： 有統編的自動對應 31 - 三聯式發票，沒統編的自動對應 33 - 雲端發票 或 32 - 二聯發票。
會計科目： 自動全押您指定的科目，例如 勞務收入 或 銷貨收入。
稅金反推： 如果 Excel 裡只有「總金額」，系統自動幫您除以 1.05 拆分出銷售額與稅額，滿足 5% 稅法防呆。
Phase 3: 預覽與送出 (Preview & Batch Submit)
預覽畫面： 在上傳至 Google Sheet 之前，在畫面上列出這 10 筆即將新增的資料，供您做最後檢視。
防爆機制： 若您確認無誤，按下「確認送出」。我們會在 

AppsScript.js
 新增一個 action: 'batchSubmit' 的 API，一口氣將這 10 筆資料寫入 Google Sheet 的最末端，避免分次呼叫 API 造成卡頓或漏單。
👨‍💻 小結： 透過這個設計，您不需要為了銀行對帳單的格式頭痛，而是直接銜接第三方發票平台的標準資料。這不僅省下了手動輸入 10 筆發票的時間，更保證了「發票平台」與「Google Sheet 帳本」兩邊的數字一毛不差！

---

## v1.0 Architectural Roadmap & Scalability Plans

### 1. The Continuous Ledger (v1.0 Immediate Goal)
- Stop hardcoding the year (e.g., `Data_2026總帳`) in Google Sheets.
- Modern General Ledgers (總帳) are continuous. The frontend already handles period filtering (本期/本年度), so a single `Data_GeneralLedger` sheet can hold 10+ years of data without requiring new tabs or deployments.

### 2. Multi-Tenant Scaling (For 100+ Users)
- **Phase A (Master Sheet)**: Add a `CompanyID` column to a single master Google Sheet to support up to ~50 users. The frontend filters by ID.
- **Phase B (Supabase Migration)**: Abandon Google Sheets for the backend. Migrate to Postgres via Supabase to handle millions of rows. Utilize Row-Level Security (RLS) to ensure users only see their own company's data.
