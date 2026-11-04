# QuickLedger 資料庫需求文件（DB PRD）

## 1. 文件資訊

- 產品：56 QuickLedger
- 功能：統編查詢與發票抬頭輔助填寫
- 版本：DB PRD v1.0
- 狀態：待確認
- 日期：2026-11-04
- 儲存層：Google Sheets + Google Apps Script
- 相關 PRD：[QuickLedger PRD](./QuickLedger%20PRD.md)

## 2. 設計原則

1. 保留現有 `Data_總帳` A:Q 欄位順序，不插入欄位，避免既有公式與備份資料錯位。
2. 新欄位只追加在 R 欄；既有資料的 R 欄為空即可相容。
3. `counterpartyName` 是使用者最終確認的帳務文字，不把 UBN 暫時查詢狀態當成帳務事實。
4. 所有來自前端的文字仍套用既有試算表公式注入防護與長度限制。
5. 不儲存完整上游回應、API 金鑰、請求內容或不必要的個人資料。

## 3. 現有 `Data_總帳` schema

| 欄位 | 試算表欄 | 現有索引 | 型別 | 說明 |
|---|---:|---:|---|---|
| id | A | 0 | string | 系統流水號，例如 `VCH-YYYYMMDD-0001` |
| recordType | B | 1 | string | `Internal`／`Both` |
| date | C | 2 | date/string | 發票日期 |
| paymentDate | D | 3 | date/string | 收付款日期 |
| expectedDate | E | 4 | date/string | 預計收付款日 |
| type | F | 5 | string | 進項／銷項 |
| formatCode | G | 6 | string | 發票格式代號 |
| invoiceNo | H | 7 | string | 發票號碼 |
| taxId | I | 8 | string | 對方統一編號 |
| amount | J | 9 | number | 未稅銷售額 |
| tax | K | 10 | number | 營業稅額 |
| total | L | 11 | number | 含稅總額 |
| taxType | M | 12 | string | 課稅別 |
| category | N | 13 | string | 會計科目 |
| advancePaymentType | O | 14 | string | 墊付類型 |
| note | P | 15 | string | 帳務備註 |
| userEmail | Q | 16 | string | 紀錄者；回傳時遮罩 |

## 4. 目標 schema

### 4.1 新增欄位

| 欄位 | 試算表欄 | 新索引 | 型別 | 必填 | 預設 | 說明 |
|---|---:|---:|---|---|---|---|
| counterpartyName | R | 17 | string | 否 | `''` | 使用者確認的發票抬頭／對方登記名稱 |

`counterpartyName` 不代表政府資料庫的永久真實名稱；它是該筆帳務由使用者確認後保存的名稱。若查詢查無或服務不可用，可由使用者自行輸入。

### 4.2 前端型別

`InvoiceFormState` 與 `LedgerRecord` 各新增：

```ts
counterpartyName: string;
```

`InvoiceFormState` 使用空字串作為初始值；讀取舊資料時使用 `record.counterpartyName || ''`。

### 4.3 API payload

`submit` 與 `update` payload 各新增：

```json
{
  "counterpartyName": "台灣範例股份有限公司"
}
```

相容規則：

- 缺少 `counterpartyName` 視為空字串。
- 後端不得因缺少 `counterpartyName` 拒絕既有客戶端請求。
- 既有欄位索引 A:Q 不變。

## 5. Apps Script 變更規格

### 5.1 寫入

`buildRowData` 將 `counterpartyName` 追加為第 18 個值：

```js
sanitizeCellValue(payload.counterpartyName || '') // R: 對方名稱
```

`submit` 使用 `appendRow` 寫入 A:R；`update` 使用 `setValues` 寫入 18 欄。文字欄位沿用既有公式注入防護，數字欄位維持數字轉型。

### 5.2 讀取

`search` 與 `getData` 回傳：

```js
counterpartyName: row[17] || ''
```

當舊資料沒有 R 欄或該欄空白時，回傳空字串。

### 5.3 初始化與查詢分頁

- `setup()` 的新資料表表頭追加 `對方名稱`，成為 R 欄。
- 既有 `Data_總帳` 若已存在，升級程式不得清空、重排或刪除資料。
- `Data_內帳` 與 `Data_外帳` 的 QUERY 範圍由 `A:Q` 擴充為 `A:R`，其他條件不變。
- 備份與還原沿用整列資料，不新增另一份名稱資料表。

## 6. UBN 查詢資料邊界

### 6.1 服務輸入

- 輸入只允許 8 位數字統一編號。
- 本地檢查碼失敗時不呼叫服務。
- UBN base URL 由 `VITE_UBN_BASE_URL` 提供；未設定時功能顯示為不可用但不影響記帳。

### 6.2 服務輸出 allow-list

只在記憶體中使用下列欄位：

| 欄位 | 用途 | 是否寫入總帳 |
|---|---|---|
| found | 判斷是否有結果 | 否 |
| ban | 與目前輸入比對 | 否 |
| name | 顯示建議與套用 | 套用後轉為 `counterpartyName` |
| status | 顯示營業狀態提醒 | 否 |
| source | 除錯或狀態說明 | 否 |
| nameHasPrivateUse | 阻止不安全名稱自動帶入 | 否 |

不保存查詢時間、IP、完整 JSON、上游錯誤內容或外部追蹤識別碼。

### 6.3 回應處理

- `200 found: true`：顯示名稱建議。
- `200 found: false`：顯示查無公開資料，允許手動輸入。
- `400 invalid_ubn`：顯示統編格式提示，但仍不替代本地欄位驗證。
- `502 upstream_unavailable`、逾時、網路錯誤、非 JSON：顯示服務暫時不可用，允許送出。

## 7. 資料完整性與相容性

- 不回填歷史資料；R 欄以空值自然表示尚未確認抬頭。
- 編輯舊資料後若使用者沒有輸入抬頭，保留空值，不從外部服務自動寫入。
- 使用者修改 `counterpartyName` 後，送出資料以最後輸入值為準。
- 統編與抬頭不做後端強制一致性檢查，因為公開資料可能不完整、名稱可能有簡繁或法定名稱差異。
- Google Sheet 備份需要能保留 A:R；既有只含 A:Q 的備份仍可還原，R 欄視為空值。

## 8. 索引、查詢與效能

- Google Sheets 不新增名稱搜尋索引；本階段仍沿用既有逐列查詢。
- 前端只在 blur／完整統編時查詢，避免逐字請求。
- 每次請求設定 1500ms 超時；不重試多次，避免外部服務與使用者等待被放大。
- 同一個統編的查詢結果只做本頁短暫記憶體快取；不得把外部回應寫入 Google Sheet 作為快取。

## 9. DB 驗收條件

1. 新建資料表的表頭有 18 欄，R 欄為「對方名稱」。
2. 舊資料 A:Q 可被 `search`、`getData`、編輯與備份還原，且 `counterpartyName` 為空字串。
3. `submit` 缺少 `counterpartyName` 仍成功；有值時正確寫入 R 欄。
4. `update` 不會改變 A:Q 的欄位位置，且可更新 R 欄。
5. `Data_內帳`、`Data_外帳` 的 QUERY 可帶出 R 欄。
6. 名稱含公式前綴或超過既有限制時，仍經 `sanitizeCellValue` 處理。
7. UBN 查詢失敗不會產生部分寫入、重複寫入或空白抬頭覆蓋既有使用者輸入。

## 10. 遷移策略

本次採「向後相容的追加欄位」策略：

1. 先更新 Apps Script 讀寫，接受 A:Q 舊資料與 A:R 新資料。
2. 再更新前端型別與表單欄位。
3. 部署前以測試試算表驗證 `setup`、新增、編輯、查詢、備份與還原。
4. 不執行刪欄、改欄、資料重排或全量回填。

## 11. 後續可選擴充（不在本次 MVP）

- 儲存「名稱來源／確認方式」供稽核。
- 對名稱做 NFKC、臺／台與空白差異比對提示。
- 將 UBN 查詢結果做有期限的邊緣快取。
- 批次匯入發票時套用同一欄位與查詢狀態模型。
