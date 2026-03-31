/// <reference types="vite/client" />
import { InvoiceType, FormatCode, TaxType, RecordType } from './types.ts';
import { getTaiwanDateString } from './utils/date.ts';

// Read from environment variable first (for Vercel/Local diff), fallback to hardcoded for safety
export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycby38nUvR7FrefEnJL8bGupcAsxtJK-iKAagY6xgKyGMdl9JjsFHrFQYNZdubddUxecW/exec';

export const APP_VERSION = 'v0.8';

export const INITIAL_FORM_STATE = {
  recordType: RecordType.BOTH,
  date: getTaiwanDateString(),
  paymentDate: getTaiwanDateString(),
  expectedDate: getTaiwanDateString(),
  type: InvoiceType.INPUT,
  formatCode: FormatCode.INPUT_TRIPLI,
  invoiceNo: '',
  taxId: '',
  amount: '' as const,
  tax: '' as const,
  total: '' as const,
  taxType: TaxType.TAXABLE,
  deductionCode: '1' as const, // Default to Deductible
  category: '',
  note: '',
};

export const FORMAT_CODE_OPTIONS = {
  [InvoiceType.OUTPUT]: [
    { value: FormatCode.TRIPLI_INVOICE, label: '31 - 三聯式發票 (公司)' },
    { value: FormatCode.DUPLI_INVOICE, label: '32 - 二聯/收銀機 (個人)' },
    { value: FormatCode.CLOUD_INVOICE, label: '33 - 雲端發票' },
    { value: FormatCode.SALES_TAX_FREE, label: '35 - 銷項免稅' },
    { value: FormatCode.SALES_RETURN, label: '34 - 銷項折讓' },
    { value: FormatCode.NO_INVOICE, label: '99 - 收據/其他 (無發票)' },
  ],
  [InvoiceType.INPUT]: [
    { value: FormatCode.INPUT_TRIPLI, label: '21 - 三聯式發票 (傳統大張)' },
    { value: FormatCode.INPUT_OTHER, label: '25 - 電子發票證明聯/收銀機 (有統編)' },
    { value: FormatCode.INPUT_DUPLI_CASH, label: '22 - 二聯收銀機 (少見)' },
    { value: FormatCode.INPUT_CUSTOMS, label: '28 - 海關代徵' },
    { value: FormatCode.INPUT_RETURN, label: '23 - 進項折讓' },
    { value: FormatCode.NO_INVOICE, label: '99 - 收據/其他 (無發票)' },
  ],
};

export const TAX_TYPE_OPTIONS = [
  { value: TaxType.TAXABLE, label: '1 - 應稅 (5%)' },
  { value: TaxType.ZERO_RATE, label: '2 - 零稅率' },
  { value: TaxType.TAX_FREE, label: '3 - 免稅' },
];

/**
 * 會計科目排序 (Frequency Optimized for One-Person Company)
 * Based on Expert Advice: Highlight non-deductible items.
 */
export const CATEGORY_GROUPS = [
  {
    groupLabel: "💰 營業收入 (Income)",
    items: [
      { value: "銷貨收入", label: "銷貨收入 (販售商品)" },
      { value: "勞務收入", label: "勞務收入 (提供專業服務)" },
      { value: "其他收入", label: "其他收入 (利息/補助金)" },
    ]
  },
  {
    groupLabel: "🚀 交通與通訊 (最常用)",
    items: [
      { value: "旅費-交通", label: "旅費-交通 (車資/洗車/停車)" },
      { value: "郵電費", label: "郵電費 (手機/網路/雲端)" },
      { value: "旅費-住宿", label: "旅費-住宿" },
    ]
  },
  {
    groupLabel: "📝 辦公與行政",
    items: [
      { value: "文具用品", label: "文具用品" },
      { value: "雜項購置", label: "雜項購置 (日常用品)" },
      { value: "書報雜誌", label: "書報雜誌/進修課程" },
    ]
  },
  {
    groupLabel: "⚠️ 餐飲與交際 (稅務敏感)",
    items: [
      { value: "伙食費", label: "伙食費 (⚠️稅額不可扣抵 / 限加班會議)" },
      { value: "交際費", label: "交際費 (⚠️稅額不可扣抵 / 須與業務有關)" },
      { value: "職工福利", label: "職工福利 (⚠️稅額不可扣抵)" },
      { value: "會議費", label: "會議費 (可扣抵 / 須附會議記錄)" },
    ]
  },
  {
    groupLabel: "💻 軟硬體與設備",
    items: [
      { value: "各項耗竭及攤提", label: "各項耗竭及攤提 (SaaS訂閱)" },
      { value: "雜項購置-硬體", label: "雜項購置-硬體 (電腦/手機 <8萬)" },
      { value: "修繕費", label: "修繕費 (設備維修)" },
    ]
  },
  {
    groupLabel: "📦 營運與其他",
    items: [
      { value: "廣告費", label: "廣告費 (FB/Google Ads)" },
      { value: "進貨", label: "進貨 (銷售用商品)" },
      { value: "薪資支出", label: "薪資支出" },
      { value: "租金支出", label: "租金支出" },
      { value: "水電瓦斯費", label: "水電瓦斯費 (有統編可扣抵)" },
    ]
  }
];

export const FLATTENED_CATEGORY_VALUES = CATEGORY_GROUPS.flatMap(g => g.items.map(i => i.value));

/**
 * AI PROMPT TEMPLATE
 * This is the exact instruction set sent to Google Gemini.
 */
export const AI_SCANNER_PROMPT = `
You are an expert accountant for a Taiwan one-person company (Sole Proprietorship). 
Analyze this invoice image and extract data strictly following Taiwan VAT regulations.

**CORE RULES (Must Follow):**
1. **Strict 5% VAT Rule**: 
   - Taiwan VAT is **ALWAYS 5%** for general invoices. 
   - NEVER output 3%, 6%, or 7%. 
   - Logic: If "Tax" is not clearly printed or looks wrong, **calculate it** based on Total: \`Tax = Round(Total / 1.05 * 0.05)\`.
   - Priority: Trust the "Total Amount" (含稅總額) most, then back-calculate Amount and Tax.

2. **Car Wash (洗車)**:
   - Category: Must be **"旅費-交通"** (Travel/Transport). 
   - Rule: Do NOT use "修繕費" (Repairs) for routine cleaning.
   - Context: Input tax is usually non-deductible for passenger cars, but extract the full amounts.

3. **Meals & Entertainment**:
   - Meals -> **"伙食費"**.
   - Entertainment -> **"交際費"**.
   - Tax is non-deductible.

4. **Format Codes**:
   - Thermal paper + Tax ID -> Use code **'25'**.
   - Traditional Triplicate (A4/Half) -> Use code **'21'**.

**Extraction Tasks:**
1. Identify if "Input" (Expense) or "Output" (Sales).
2. Extract Date (YYYY-MM-DD). Convert ROC years (e.g., 115 -> 2026).
3. Extract Amount (Sales Amount excluding tax).
4. Extract Tax (5% VAT). **Must be exactly Math.round(Amount * 0.05)**.
5. Extract Total (Amount + Tax).
6. Suggest the Category from this list: {{CATEGORY_LIST}}.
7. **Extract Note (Must be Traditional Chinese)**:
   - **Format**: "商家名稱 - 商品".
   - **Language**: Translate item names to **Traditional Chinese (繁體中文)**.
   - **Example**: "7-11 - 拿鐵", "台灣中油 - 95無鉛汽油", "Uber - 車資".
   - **Instruction**: Keep the Merchant Name (English/Chinese OK), but describe the Item in Chinese.

If specific fields are not found, leave them null.
`;