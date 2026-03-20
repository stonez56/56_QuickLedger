# 🧾 收支快記雲 v0.2 ( 56 QuickLedger)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini_Flash-orange)
![Vite](https://img.shields.io/badge/Build-Vite-purple)

這是一套專為台灣**自由接案者 (Freelancer)** 與 **一人公司 or 小型公司** 量身打造的輕量級智慧記帳系統。

結合了 **Google Gemini AI** 的強大影像辨識能力與 **Google Sheets** 的高便利性，讓您無需購買昂貴的會計軟體，
也能透過手機或電腦輕鬆完成符合台灣稅法（5% 營業稅）的帳務處理。

---

## ✨ 核心功能

*   **📸 AI 智慧掃描**: 透過 Google Gemini 視覺模型，自動從發票或收據圖片中萃取日期、統編、金額與品項。
*   **🧠 專業會計邏輯**:
    *   自動校正台灣 5% 營業稅（排除 AI 偶發的 3%、7% 幻覺）。
    *   內建「不可扣抵」防呆機制（如：自用小客車洗車、交際費、職工福利），並給予黃色警示。
    *   自動將商家與品項標準化為繁體中文（例：`Uber - 車資`）。
*   **☁️ 雲端資料庫**: 記帳資料直接寫入您專屬的 Google Sheet，資料 100% 掌握在自己手中。
*   **📱 響應式設計 (RWD)**: 完美支援智慧型手機、平板與電腦，並具備保護眼睛的深色模式 (Dark Mode)。
*   **🔒 安全驗證**: 透過 Email 與自訂 Secret 雙重驗證，防止未經授權的寫入。

---

## ⚡ 快速開始 (Quick Start)

如果您只想先在本地端運行專案，請跟著以下步驟：

1. **安裝依賴套件** (若遇到 ERESOLVE 錯誤，請加上 `--legacy-peer-deps`) :
   ```bash
   npm install --legacy-peer-deps
   ```
2. **設定環境變數**: 在根目錄建立 `.env` 檔案並填入您的 Gemini API Key：
   ```env
   VITE_GEMINI_API_KEY=您的_GEMINI_API_KEY
   ```
3. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```

*註：完整系統設定（如 Google Sheet 連接、API 設定）請參閱下方的 [安裝與設定教學](#步驟-1準備-google-sheet-後端資料庫)。*

---

## 🛠️ 系統架構

本專案採用 **Serverless** 架構，前端直接與 Google 服務溝通，無需額外租用後端伺服器：

*   **前端框架**: React 19 + Vite
*   **UI 樣式**: Tailwind CSS (透過 Twind 引擎即時編譯) + Lucide Icons
*   **AI 引擎**: Google Gemini API (`gemini-3-flash-preview`)
*   **後端/資料庫**: Google Apps Script (GAS) + Google Sheets

---

# 在 WSL 本地測試 Vercel Serverless Functions

標準的 `npm run dev`（Vite）無法在本地執行 Vercel 的 Serverless Functions。  
若要在部署到正式環境前測試 API Scanner，本地測試方式如下：

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 連結專案
vercel link

# 拉取開發環境變數
vercel env pull .env.development.local

# 執行本地 Vercel 伺服器
vercel dev


---

## 🚀 安裝與設定教學 (Installation & Setup)

### 步驟 1：準備 Google Sheet (後端資料庫)

1.  登入您的 Google 帳號，建立一個新的 Google Sheet。
2.  在試算表中建立兩個分頁 (Tab)：
    *   **Sheet1** (或重新命名為 `Records`): 用於儲存記帳資料。
        *   建議在第一列 (Row 1) 建立標題：`時間戳記`, `日期`, `收付日期`, `預計收付日`, `內外帳`, `進銷`, `格式`, `號碼`, `統編`, `銷售額`, `稅額`, `總額`, `稅別`, `扣抵`, `科目`, `備註`, `使用者`.
    *   **Config**: 用於系統身分驗證。
        *   `A1` 儲存格輸入：`API_SECRET` | `B1` 儲存格輸入：(您自訂的密碼，例如 `mySecret123`)
        *   `A2` 儲存格輸入：`ALLOWED_USERS` | `B2` 儲存格輸入：(您的 Email，例如 `user@gmail.com`)

### 步驟 2：設定 Google Apps Script (API 介面)

1.  在剛剛建立的 Google Sheet 中，點擊上方選單的 `擴充功能` > `Apps Script`。
2.  將後端處理程式碼（負責接收前端的 `submit` 與 `getConfig` 請求並寫入試算表）貼上至編輯器中。
3.  **部署為網頁應用程式**:
    *   點擊右上角「部署」>「新增部署作業」。
    *   選取類型：`網頁應用程式`。
    *   執行身分：**我 (Me)**。
    *   誰可以存取：**任何人 (Anyone)** (前端需要跨網域呼叫，安全性由 Config 分頁的 Secret 把關)。
4.  複製部署成功後產生的 **網頁應用程式 URL (Web App URL)**。

### 步驟 3：設定前端專案

1.  複製本專案程式碼至您的本地環境。
2.  開啟專案中的 `constants.ts` 檔案。
3.  找到 `APPS_SCRIPT_URL` 變數，將其替換為您在步驟 2 複製的 Google Apps Script URL：

```typescript
// constants.ts
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/您的ID/exec';
```

### 步驟 4：獲取 Gemini API Key

1.  前往 [Google AI Studio](https://aistudio.google.com/)。
2.  點擊 "Get API key" 並建立一個新的 API Key。
3.  此 Key 將用於前端呼叫 Gemini 模型進行圖片辨識。

---

## 📦 部署與執行 (Deployment)

本專案使用 Vite 進行建置。

### 本地開發與分離測試環境 (Testing Environment)

為保護您的正式財務資料，強烈建議建立**獨立的測試用 Google Sheet**：
1. **複製 Sheet**: 建立正式 Google Sheet 的副本（例如：`QuickLedger_Test`）。
2. **部署測試版 API**: 在測試 Sheet 中貼上 `AppsScript.js`，並發布「新的」網頁應用程式部署。複製該測試版 URL。
3. **設定本地環境變數**: 在本專案根目錄建立 `.env.local` 檔案（此檔案不會上傳至 GitHub）：
   ```env
   VITE_APPS_SCRIPT_URL="您的測試版 Web App URL"
   ```
4.  啟動開發伺服器：
    ```bash
    npm run dev
    ```
這樣在本地開發、測試新增/刪除時，都不會影響到正在使用的正式版資料庫。

### 雲端部署 (以 Vercel 為例)

1.  將程式碼推送到 GitHub。
2.  在 Vercel 新增專案並匯入您的 Repository。
3.  **關鍵步驟**：在 Vercel 的專案設定 (Settings) > **Environment Variables** 中新增：
    *   Key: `VITE_GEMINI_API_KEY` (您的 Gemini API Key)
    *   Key: `VITE_APPS_SCRIPT_URL` (您「**正式版**」 Google Sheet 的 Web App URL)
4.  點擊 Deploy 完成部署。

---

## 📖 使用說明 (How to Use)

1.  **系統登入**:
    *   開啟應用程式，輸入您的 Email。
    *   輸入您在 Google Sheet `Config` 分頁中設定的 Secret 密碼。
    *   可勾選「記住帳號」以便下次快速登入。
2.  **AI 智慧掃描憑證**:
    *   點擊畫面上的「AI 掃描」按鈕。
    *   使用手機相機拍攝發票/收據，或從電腦上傳圖片。
    *   系統會自動辨識並填入：日期、發票號碼、金額、稅額、統編。
    *   **自動分類**：AI 會根據消費內容自動建議會計科目（例如：看到 "台灣中油" 會自動選擇 "旅費-交通"）。
3.  **人工核對與防呆機制**:
    *   請務必再次核對辨識出的金額與稅額是否正確。
    *   若系統偵測到敏感科目（如：「交際費」、「職工福利」或品項包含「洗車」），會跳出**黃色警示**，提醒您依據台灣營業稅法第 19 條，這些項目的進項稅額不得扣抵，建議將稅額歸零並併入成本。
4.  **特殊帳務處理**:
    *   **非應收應付**：若款項已當場結清，請勾選「非應收應付」，系統會自動將「收/付款日期」與「預計收/付款日」設為與發票日期相同。
    *   **內外帳分離**：可選擇此筆帳務是「內外帳 (含稅憑證)」或「僅內帳 (無憑證/不報稅)」。
5.  **確認送出**:
    *   點擊「確認送出」，資料即會透過 API 即時寫入您的 Google Sheet 中。

---

## 🧠 進階設定：調整 AI 提示詞 (Prompt Tuning)

若您希望 AI 能適應您公司特定的記帳習慣（例如：將特定商家的消費固定歸類為某個科目），您可以直接修改前端程式碼中的 Prompt。

1.  開啟 `constants.ts` 檔案。
2.  找到 `export const AI_SCANNER_PROMPT`。
3.  在 `CORE RULES` 區塊中加入您的客製化規則，例如：
    ```typescript
    5. **Vendor Overrides**:
       - If the merchant is "Apple", ALWAYS suggest category "雜項購置-硬體".
       - If the merchant is "Costco", suggest category "伙食費".
    ```

---

## 📝 授權 (License)
License: Proprietary
Usage of this software requires purchase or explicit permission from the author.
