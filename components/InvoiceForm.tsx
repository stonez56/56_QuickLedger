import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  RotateCcw, 
  FileText, 
  Hash, 
  DollarSign, 
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  ExternalLink,
  Table2,
  History,
  ShieldAlert,
  Ban,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  InvoiceType, 
  TaxType, 
  RecordType,
  InvoiceFormState, 
  AppConfig, 
  ApiResponse 
} from '../types.ts';
import { 
  INITIAL_FORM_STATE, 
  FORMAT_CODE_OPTIONS, 
  CATEGORY_GROUPS, 
  TAX_TYPE_OPTIONS 
} from '../constants.ts';
import { Card, Input, Select, Button, Label } from './UI.tsx';
import { isValidTaiwanTaxId } from '../utils/validation.ts';
import { Scanner } from './Scanner.tsx';

interface InvoiceFormProps {
  config: AppConfig;
  onLogout: () => void;
}

const LAST_SCAN_KEY = 'last_scanned_invoice';
// Based on expert advice: Meals, Entertainment, Welfare, and Car Wash (for passenger cars) are non-deductible.
const RISKY_CATEGORIES = ['伙食費', '交際費', '職工福利'];
const RISKY_KEYWORDS = ['洗車'];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ config, onLogout }) => {
  const [formData, setFormData] = useState<InvoiceFormState>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; detail?: React.ReactNode } | null>(null);
  const [hasLastScan, setHasLastScan] = useState(false);
  const [isTaxManuallyEdited, setIsTaxManuallyEdited] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isNotARAP, setIsNotARAP] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAccountingGuide, setShowAccountingGuide] = useState(false);
  const [instructionTab, setInstructionTab] = useState<'both' | 'internal'>('both');

  useEffect(() => {
    const saved = localStorage.getItem(LAST_SCAN_KEY);
    if (saved) {
      setHasLastScan(true);
    }
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFormData(prev => ({ ...prev, amount: '', tax: '', total: '' }));
      return;
    }
    const amount = Number(val);
    let tax = 0;
    let total = amount;
    if (formData.taxType === TaxType.TAXABLE && formData.recordType !== RecordType.INTERNAL) {
      tax = Math.round(amount * 0.05);
      total = amount + tax;
    }
    setFormData(prev => ({ ...prev, amount: val, tax, total }));
    setIsTaxManuallyEdited(false);
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFormData(prev => ({ ...prev, amount: '', tax: '', total: '' }));
      return;
    }
    const total = Number(val);
    let tax = 0;
    let amount = total;
    if (formData.taxType === TaxType.TAXABLE && formData.recordType !== RecordType.INTERNAL) {
      amount = Math.round(total / 1.05);
      tax = total - amount;
    }
    setFormData(prev => ({ ...prev, total: val, amount, tax }));
    setIsTaxManuallyEdited(false);
  };

  const handleTaxTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTaxType = e.target.value as TaxType;
    setFormData(prev => {
      const amount = Number(prev.amount || 0);
      let tax = 0;
      let total = amount;
      if (newTaxType === TaxType.TAXABLE && prev.recordType !== RecordType.INTERNAL) {
         tax = Math.round(amount * 0.05);
         total = amount + tax;
      }
      return { ...prev, taxType: newTaxType, tax, total };
    });
    setIsTaxManuallyEdited(false);
  };

  const handleRecordTypeChange = (newRecordType: RecordType) => {
    setFormData(prev => {
      const amount = Number(prev.amount || 0);
      let tax = 0;
      let total = amount;
      if (prev.taxType === TaxType.TAXABLE && newRecordType !== RecordType.INTERNAL) {
         tax = Math.round(amount * 0.05);
         total = amount + tax;
      }
      return { ...prev, recordType: newRecordType, tax, total };
    });
    setIsTaxManuallyEdited(false);
  };

  const handleReset = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      date: new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date().toISOString().split('T')[0],
    });
    setIsNotARAP(true);
    setIsTaxManuallyEdited(false);
    setMessage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // If date changes and it's not AR/AP, sync the payment dates
      if (name === 'date' && isNotARAP) {
        newData.paymentDate = value;
        newData.expectedDate = value;
      }
      
      return newData;
    });
  };

  const handleNotARAPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsNotARAP(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        paymentDate: prev.date,
        expectedDate: prev.date
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        paymentDate: '',
        expectedDate: ''
      }));
    }
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTax = Number(e.target.value);
    setIsTaxManuallyEdited(true); // Flag as manual so auto-calc doesn't revert it
    
    setFormData(prev => {
      // Allow manual tax adjustment to update the Total (fixing the $220 vs $221 issue)
      const currentAmount = typeof prev.amount === 'number' ? prev.amount : 0;
      return { 
        ...prev, 
        tax: newTax,
        total: currentAmount + newTax
      };
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as InvoiceType;
    const firstFormatCode = FORMAT_CODE_OPTIONS[newType][0].value;
    setFormData(prev => ({ 
      ...prev, 
      type: newType, 
      formatCode: firstFormatCode 
    }));
  };

  const setDeductionCode = (code: '1' | '4') => {
    setFormData(prev => ({ ...prev, deductionCode: code }));
  };

  // Professional Fix: Instead of zeroing tax, we strictly enforce correct calculation + mark as non-deductible.
  // Wait, the manual says for non-deductible: "將含稅價填入未稅金額，稅額填 0"
  const markAsNonDeductibleAndFixTax = () => {
    const currentTotal = Number(formData.total || 0);

    setFormData(prev => ({
        ...prev,
        amount: currentTotal,
        tax: 0,
        total: currentTotal,
        taxType: TaxType.TAXABLE,
        deductionCode: '4', // Mark as Non-deductible
        recordType: RecordType.INTERNAL // Force to internal logic to keep tax 0
    }));
    setIsTaxManuallyEdited(false);
  };

  const populateFormData = (data: any) => {
    console.log("Populating Form Data:", data);

    // Robust Type Detection
    const typeStr = (data.type || '').toLowerCase();
    const newType = (typeStr.includes('output') || typeStr.includes('sales')) 
        ? InvoiceType.OUTPUT 
        : InvoiceType.INPUT;

    // Robust Format Code
    let newFormatCode = data.formatCode;
    const validCodes = FORMAT_CODE_OPTIONS[newType].map(o => o.value);
    if (!validCodes.includes(newFormatCode)) {
      newFormatCode = validCodes[0]; 
      if (newType === InvoiceType.INPUT && data.taxId && FORMAT_CODE_OPTIONS[InvoiceType.INPUT].some(o => o.value === '25')) {
          newFormatCode = '25';
      }
    }

    let newDate = data.date || '';
    newDate = newDate.replace(/\//g, '-');

    const parseNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const num = parseFloat(val.replace(/,/g, ''));
            return isNaN(num) ? '' : num;
        }
        return '';
    };

    const newAmount = parseNumber(data.amount);
    const newTax = parseNumber(data.tax);
    const newTotal = parseNumber(data.total);

    setFormData(prev => {
      const finalDate = newDate || prev.date;
      return {
        ...prev,
        recordType: RecordType.BOTH,
        type: newType,
        formatCode: newFormatCode,
        date: finalDate,
        paymentDate: isNotARAP ? finalDate : prev.paymentDate,
        expectedDate: isNotARAP ? finalDate : prev.expectedDate,
        invoiceNo: data.invoiceNo || prev.invoiceNo,
        taxId: data.taxId || prev.taxId,
        amount: newAmount,
        tax: newTax,
        total: newTotal,
        category: data.category || prev.category,
        note: data.note || prev.note || '',
        deductionCode: '1' // Reset to deductible on new scan
      };
    });

    // Critical Fix: If the Scanner's Tax doesn't match the 5% Calculation (due to rounding differences),
    // we must treat it as "Manually Edited" to prevent calculateTotals() from overwriting 
    // the correct Total (e.g. 220) with a calculated Total (e.g. 221).
    if (typeof newAmount === 'number' && typeof newTax === 'number') {
        const calculatedTax = Math.round(newAmount * 0.05);
        if (newTax !== calculatedTax) {
            console.log(`Rounding Mismatch Detected: Scanner Tax ${newTax} vs Calc ${calculatedTax}. Trusting Scanner.`);
            setIsTaxManuallyEdited(true);
        } else {
            setIsTaxManuallyEdited(false);
        }
    } else {
        setIsTaxManuallyEdited(false);
    }
  };

  const handleScanResult = (data: any) => {
    localStorage.setItem(LAST_SCAN_KEY, JSON.stringify(data));
    setHasLastScan(true);

    populateFormData(data);
    setShowScanner(false);
    
    const amountFound = data.amount ? `金額 $${data.amount}` : '未偵測到金額';
    setMessage({ 
        type: 'success', 
        text: `AI 辨識完成！`, 
        detail: `已填入：${amountFound}、${data.category || '無建議科目'}。請務必核對。` 
    });
  };

  const restoreLastScan = () => {
    try {
      const saved = localStorage.getItem(LAST_SCAN_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        populateFormData(data);
        setMessage({ type: 'success', text: '已載入上一次的掃描資料。' });
      }
    } catch (e) {
      console.error("Failed to restore scan", e);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!formData.amount) {
      setMessage({ type: 'error', text: '請輸入銷售額/支付額' });
      return;
    }
    if (!formData.category) {
      setMessage({ type: 'error', text: '請選擇會計科目' });
      return;
    }

    const isTriplicate = ['21', '31'].includes(formData.formatCode);
    if (isTriplicate && !formData.taxId) {
        setMessage({ type: 'error', text: '三聯式發票必須輸入統編 (Tax ID)' });
        return;
    }
    if (formData.taxId && !isValidTaiwanTaxId(formData.taxId) && formData.formatCode !== '99') {
        setMessage({ type: 'error', text: '統編格式錯誤', detail: '請檢查 8 碼統編是否正確' });
        return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setMessage(null);

    // Mapping for Google Sheet
    const TYPE_MAPPING = {
      [InvoiceType.INPUT]: '進項 (支出)',
      [InvoiceType.OUTPUT]: '銷項 (收入)',
    };

    let taxTypeLabel = '';
    const baseTaxLabel = TAX_TYPE_OPTIONS.find(t => t.value === formData.taxType)?.label || formData.taxType;
    
    // Append Non-deductible flag to Tax Type string so it's visible in the Sheet
    if (formData.type === InvoiceType.INPUT && formData.deductionCode === '4') {
        taxTypeLabel = `${baseTaxLabel} (不可扣抵)`;
    } else {
        taxTypeLabel = baseTaxLabel;
    }

    // Correct 1-to-1 Mapping to match the Sheet columns
    const payload = {
      action: 'submit',
      secret: config.apiSecret,
      userEmail: config.userEmail,
      recordType: formData.recordType,
      date: formData.date,
      paymentDate: formData.paymentDate,
      expectedDate: formData.expectedDate,
      type: TYPE_MAPPING[formData.type], 
      formatCode: formData.formatCode,
      invoiceNo: formData.invoiceNo,
      taxId: formData.taxId,
      amount: Number(formData.amount),
      tax: Number(formData.tax),
      total: Number(formData.total),
      taxType: taxTypeLabel,
      category: formData.category,
      note: formData.note,
    };

    try {
      const response = await fetch(config.scriptUrl, {
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
      let result: ApiResponse;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("伺服器回傳格式錯誤 (非 JSON)");
      }

      if (result.status === 'success') {
        setMessage({ type: 'success', text: `成功錄入! (Row: ${result.row})` });
        setFormData(prev => ({
          ...INITIAL_FORM_STATE,
          date: prev.date,
          type: prev.type,
          formatCode: prev.formatCode,
          paymentDate: isNotARAP ? prev.date : '',
          expectedDate: isNotARAP ? prev.date : '',
        }));
        setIsTaxManuallyEdited(false);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error("Submission Error:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const isTaxIdValid = formData.taxId === '' || isValidTaiwanTaxId(formData.taxId) || formData.formatCode === '99';
  const isRiskyCategory = RISKY_CATEGORIES.some(c => formData.category.includes(c));
  const isRiskyKeyword = RISKY_KEYWORDS.some(k => formData.note.includes(k) || formData.category.includes(k));
  // Show warning if it's risky AND user currently has it marked as deductible ('1')
  const showWarning = (isRiskyCategory || isRiskyKeyword) && formData.type === InvoiceType.INPUT && formData.deductionCode === '1' && formData.recordType !== RecordType.INTERNAL;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {showScanner && <Scanner onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center justify-center">
                 <img src="/light_stonez56_256x265_icon.png" alt="Logo" className="w-8 h-8 mr-3 object-contain" />
                 收支快記雲 v0.2
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 ml-2">2026 帳期</span>
              </h2>
              <p className="text-slate-400 text-sm">{config.userEmail}</p>
            </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20 hover:text-sky-300 transition-colors border border-sky-500/20 shrink-0"
            title="使用說明"
          >
            <HelpCircle size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowAccountingGuide(true)}
            className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors shrink-0"
            title="記帳需知"
          >
            <FileText size={14} className="mr-1.5" />
            記帳需知
          </button>
          {config.sheetUrl && (
            <a 
              href={config.sheetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-sky-400 bg-sky-950/50 border border-sky-900/50 rounded-lg hover:bg-sky-900/50 transition-colors shrink-0"
            >
              <Table2 size={14} className="mr-2" />
              查看報表
              <ExternalLink size={12} className="ml-1 opacity-50" />
            </a>
          )}
          <Button variant="ghost" onClick={onLogout} size="sm" className="flex-1 md:flex-none shrink-0">登出</Button>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sky-400 font-semibold text-sm uppercase tracking-wider flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                憑證分類
              </h3>
              <div className="flex gap-2">
                {hasLastScan && (
                   <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-slate-400 hover:text-white"
                    onClick={restoreLastScan}
                    title="載入上一次掃描的資料"
                  >
                    <History size={14} className="mr-1.5" />
                    載入上次
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20"
                  onClick={() => setShowScanner(true)}
                >
                  <Sparkles size={14} className="mr-1.5" />
                  AI 掃描
                </Button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-lg p-1 flex border border-slate-700 mb-4 relative">
              <div className="absolute -top-3 -left-2 bg-slate-900 px-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNotARAP}
                    onChange={handleNotARAPChange}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500/20 bg-slate-800"
                  />
                  <span className="text-[11px] text-rose-400 font-medium tracking-wide">非應收應付</span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, recordType: RecordType.BOTH }))}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors flex items-center justify-center ${
                  formData.recordType === RecordType.BOTH 
                    ? 'bg-sky-600/20 text-sky-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                內外帳 (含稅憑證)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, recordType: RecordType.INTERNAL }))}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors flex items-center justify-center ${
                  formData.recordType === RecordType.INTERNAL 
                    ? 'bg-amber-600/20 text-amber-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                僅內帳 (無憑證/不報稅)
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Select
                id="type"
                name="type"
                label="進銷別"
                value={formData.type}
                onChange={handleTypeChange}
                options={[
                  { value: InvoiceType.INPUT, label: '進項 (支出)' },
                  { value: InvoiceType.OUTPUT, label: '銷項 (收入)' },
                ]}
              />
              <Input
                id="date"
                name="date"
                type="date"
                label="發票日期"
                value={formData.date}
                onChange={handleChange}
                required
                icon={Calendar}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  label="收/付款日期"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  icon={Calendar}
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">若當下未收付(應收/應付)，請留白</p>
              </div>
              <Input
                id="expectedDate"
                name="expectedDate"
                type="date"
                label="預計收/付款日"
                value={formData.expectedDate}
                onChange={handleChange}
                icon={Calendar}
              />
            </div>

            <Select
              id="formatCode"
              name="formatCode"
              label="格式代號"
              value={formData.formatCode}
              onChange={handleChange}
              options={FORMAT_CODE_OPTIONS[formData.type]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="invoiceNo"
                name="invoiceNo"
                label="發票號碼"
                placeholder="AA12345678"
                value={formData.invoiceNo}
                onChange={(e) => setFormData(prev => ({...prev, invoiceNo: e.target.value.toUpperCase()}))}
                maxLength={10}
                icon={Hash}
              />
              <div className="relative">
                <Input
                  id="taxId"
                  name="taxId"
                  label="對方統編"
                  placeholder="8位數字"
                  value={formData.taxId}
                  onChange={handleChange}
                  maxLength={8}
                  error={!isTaxIdValid ? "統編邏輯錯誤" : ""}
                  required={['21', '31'].includes(formData.formatCode) && formData.formatCode !== '99'}
                />
                 {isTaxIdValid && formData.taxId.length === 8 && formData.formatCode !== '99' && (
                   <CheckCircle2 className="absolute top-9 right-3 text-emerald-500 w-4 h-4 animate-in zoom-in" />
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              金額明細
            </h3>

            <div className="space-y-4">
              <Input
                id="total"
                name="total"
                type="number"
                label="總金額 (含稅)"
                placeholder="0"
                value={formData.total}
                onChange={handleTotalChange}
                required
                icon={DollarSign}
                className="font-mono text-xl tracking-tight font-bold text-emerald-400"
              />

              <Input
                id="amount"
                name="amount"
                type="number"
                label="銷售金額 / 支付金額 (未稅)"
                placeholder="0"
                value={formData.amount}
                onChange={handleAmountChange}
                required
                icon={DollarSign}
                className="font-mono text-lg tracking-tight"
              />

              <div className="grid grid-cols-2 gap-4">
                 <Select
                  id="taxType"
                  name="taxType"
                  label="應稅/零稅/免稅"
                  value={formData.taxType}
                  onChange={handleTaxTypeChange}
                  options={TAX_TYPE_OPTIONS}
                />
                 <Input
                  id="tax"
                  name="tax"
                  type="number"
                  label="營業稅額 (5%)"
                  value={formData.tax}
                  onChange={handleTaxChange}
                  readOnly={formData.taxType !== TaxType.TAXABLE || formData.recordType === RecordType.INTERNAL}
                  className={(formData.taxType === TaxType.TAXABLE && formData.recordType !== RecordType.INTERNAL) ? "" : "bg-slate-900/50 text-slate-400 cursor-not-allowed"}
                />
              </div>

            {formData.type === InvoiceType.INPUT && formData.taxType === TaxType.TAXABLE && formData.recordType !== RecordType.INTERNAL && (
              <div className="bg-slate-950 rounded-lg p-1 flex border border-slate-700">
                <button
                  type="button"
                  onClick={() => setDeductionCode('1')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors flex items-center justify-center ${
                    formData.deductionCode === '1' 
                      ? 'bg-emerald-600/20 text-emerald-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <CheckCircle size={14} className="mr-1.5" />
                  可扣抵
                </button>
                <button
                  type="button"
                  onClick={() => setDeductionCode('4')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors flex items-center justify-center ${
                    formData.deductionCode === '4' 
                      ? 'bg-amber-600/20 text-amber-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Ban size={14} className="mr-1.5" />
                  不可扣抵
                </button>
              </div>
            )}
              
              {showWarning && formData.taxType === TaxType.TAXABLE && Number(formData.tax) > 0 && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-sm flex gap-3 items-start">
                     <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                     <div className="space-y-2 flex-1">
                       <p className="font-bold">會計師提醒：此類別稅額通常「不可扣抵」</p>
                       <p className="opacity-80 text-xs">營業稅法規定，交際費、職工福利及自用乘人小汽車(洗車)之進項稅額不得扣抵。建議將稅額設為 0 (併入成本)。</p>
                       <Button 
                         type="button" 
                         variant="secondary" 
                         size="sm" 
                         className="w-full text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/20"
                         onClick={markAsNonDeductibleAndFixTax}
                       >
                         一鍵修正：標記為「不可扣抵」 (稅額保留)
                       </Button>
                     </div>
                   </div>
                 </div>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-3 md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Label htmlFor="category" required className="text-xs">帳務歸屬-會計科目</Label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 mt-1 appearance-none group"
                    >
                        <option value="" disabled>-- 請選擇類別 --</option>
                        {CATEGORY_GROUPS.map((group) => (
                          <optgroup key={group.groupLabel} label={group.groupLabel} className="bg-slate-900">
                            {group.items.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500 mt-6">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                </div>
                
                <div className="relative">
                    <Label htmlFor="note" className="text-xs">帳務歸屬-備註說明</Label>
                    <input
                        id="note"
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        placeholder="如：購買電腦、固定資產..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 mt-1"
                    />
                </div>
            </div>
          </Card>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 z-40 safe-area-bottom">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4">
                <Button 
                    type="submit" 
                    className="w-full md:w-auto md:flex-1 py-3 text-lg font-bold shadow-lg shadow-sky-900/20"
                    isLoading={loading}
                    icon={Save}
                >
                    確認送出
                </Button>
                
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleReset}
                    icon={RotateCcw}
                    disabled={loading}
                    className="w-full md:w-auto"
                >
                    重置
                </Button>

                {message && (
                    <div className={`w-full md:w-auto flex-1 px-4 py-2 rounded-lg text-sm font-medium flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 ${
                        message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                        <div className="flex items-center mb-1">
                            {message.type === 'error' && <WifiOff className="w-4 h-4 mr-2" />}
                            <span className="font-bold">{message.text}</span>
                        </div>
                        {message.detail && (
                            <div className="text-xs mt-1 text-rose-300/90 pl-6 leading-relaxed">
                                {message.detail}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </form>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                記帳使用說明
              </h3>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex border-b border-slate-800 shrink-0">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-medium transition-colors ${instructionTab === 'both' ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-950/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                onClick={() => setInstructionTab('both')}
              >
                內外帳記錄方法
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-medium transition-colors ${instructionTab === 'internal' ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-950/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                onClick={() => setInstructionTab('internal')}
              >
                內帳記錄方法
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm text-slate-300 overflow-y-auto">
              {instructionTab === 'both' ? (
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
              ) : (
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
            </div>
            
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end shrink-0">
              <Button onClick={() => setShowInstructions(false)}>
                我瞭解了
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Guide Modal */}
      {showAccountingGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                記帳需知
              </h3>
              <button 
                onClick={() => setShowAccountingGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-sm text-slate-300 overflow-y-auto">
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
            </div>
            
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end shrink-0">
              <Button onClick={() => setShowAccountingGuide(false)}>
                我瞭解了
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-sky-500/20 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold text-white">資料輸入完成</h3>
            </div>
            
            <div className="p-5 space-y-3 text-sm">
              <p className="text-slate-400 mb-4">請確認以下資料是否正確：</p>
              
              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">入帳類型</span>
                  <span className="text-slate-200 font-medium">{formData.recordType === RecordType.BOTH ? '內外帳 (含稅)' : '僅內帳'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">憑證種類</span>
                  <span className="text-slate-200 font-medium">{formData.type === InvoiceType.INPUT ? '進項 (支出)' : '銷項 (收入)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">發票日期</span>
                  <span className="text-slate-200 font-medium">{formData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">會計科目</span>
                  <span className="text-slate-200 font-medium">{CATEGORY_GROUPS.flatMap(g => g.items).find(i => i.value === formData.category)?.label || formData.category}</span>
                </div>
                <div className="border-t border-slate-800 my-2 pt-2 flex justify-between">
                  <span className="text-slate-400">總金額</span>
                  <span className="text-emerald-400 font-bold text-lg">${Number(formData.total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-2">
              <Button 
                type="button" 
                className="w-full py-2.5 font-bold"
                onClick={handleConfirmSubmit}
                isLoading={loading}
              >
                確認送出 (Confirm)
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 py-2"
                  onClick={() => setShowConfirmModal(false)}
                >
                  繼續編輯 (Edit)
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => {
                    handleReset();
                    setShowConfirmModal(false);
                  }}
                >
                  刪除重填 (Del)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};