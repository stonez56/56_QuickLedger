
export enum InvoiceType {
  OUTPUT = 'Output', // 銷項 (Sales)
  INPUT = 'Input',   // 進項 (Purchase)
}

export enum RecordType {
  BOTH = 'Both',         // 內外帳 (有合法憑證，可供報稅)
  INTERNAL = 'Internal', // 僅內帳 (無合法憑證，或不打算報稅)
}

export enum TaxType {
  TAXABLE = '1',     // 應稅
  ZERO_RATE = '2',   // 零稅率
  TAX_FREE = '3',    // 免稅
}

// Based on standard TW invoice format codes
export enum FormatCode {
  // Output
  TRIPLI_INVOICE = '31', // 三聯式
  DUPLI_INVOICE = '32',  // 二聯式/收銀機
  CLOUD_INVOICE = '33',  // 雲端
  SALES_RETURN = '34',   // 銷項折讓
  SALES_TAX_FREE = '35', // 銷項免稅

  // Input
  INPUT_TRIPLI = '21',   // 進項三聯
  INPUT_DUPLI_CASH = '22', // 進項二聯收銀機
  INPUT_RETURN = '23',   // 進項折讓
  INPUT_OTHER = '25',    // 其他有稅憑證
  INPUT_CUSTOMS = '28',  // 海關代徵
  NO_INVOICE = '99',     // 收據/其他 (無發票)
}

export interface AppConfig {
  scriptUrl: string;
  sheetUrl?: string; // Optional URL to the Google Sheet
  apiSecret: string;
  userEmail: string;
}

export interface InvoiceFormState {
  recordType: RecordType;
  date: string; // 發票日期
  paymentDate: string; // 收付款日期
  expectedDate: string; // 預計收付款日
  type: InvoiceType;
  formatCode: string;
  invoiceNo: string;
  taxId: string; // 統編
  amount: number | ''; // 銷售額
  tax: number | ''; // 稅額
  total: number | ''; // 總額
  taxType: TaxType;
  deductionCode: '1' | '4'; // '1': 可扣抵, '4': 不可扣抵 (Standard TW e-Invoice Codes)
  category: string;
  note: string;
}

export interface LedgerRecord {
  id: string; // 流水號
  recordType: RecordType;
  date: string;
  paymentDate: string;
  expectedDate: string;
  type: string; // "進項 (支出)" | "銷項 (收入)"
  formatCode: string;
  invoiceNo: string;
  taxId: string;
  amount: number;
  tax: number;
  total: number;
  taxType: string;
  category: string;
  note: string;
  userEmail: string;
  rowIndex: number;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  row?: number;
  id?: string;
  data?: LedgerRecord[];
  users?: string[];
}
