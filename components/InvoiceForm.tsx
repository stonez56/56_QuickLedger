import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  HelpCircle,
  Settings,
  ImagePlus,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getTaiwanDateString } from '../utils/date.ts';
import { 
  InvoiceType, 
  TaxType, 
  RecordType,
  InvoiceFormState, 
  AppConfig, 
  ApiResponse,
  LedgerRecord
} from '../types.ts';
import { 
  INITIAL_FORM_STATE, 
  TAX_TYPE_OPTIONS
} from '../constants.ts';
import { Card, Input, Select, Button, Label } from './UI.tsx';
import { isValidTaiwanTaxId } from '../utils/validation.ts';
import { Scanner } from './Scanner.tsx';
import { useConfig } from '../contexts/ConfigContext.tsx';

interface InvoiceFormProps {
  config: AppConfig;
  initialData?: LedgerRecord | null;
  onClearEdit?: (wasSaved?: boolean) => void;
}

const LAST_SCAN_KEY = 'last_scanned_invoice';
// Based on expert advice: Meals, Entertainment, Welfare, and Car Wash (for passenger cars) are non-deductible.
const RISKY_CATEGORIES = ['伙食費', '交際費', '職工福利'];
const RISKY_KEYWORDS = ['洗車'];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ config, initialData, onClearEdit }) => {
  const { categories, formatCodes } = useConfig();
  const [formData, setFormData] = useState<InvoiceFormState>(INITIAL_FORM_STATE);
  // Dynamic Filtering based on current form type and Soft-Delete Status
  const filteredFormatCodes = formatCodes.filter(c => formData.type === InvoiceType.INPUT ? (c.value.startsWith('2') || c.value === '99') : (c.value.startsWith('3') || c.value === '99'));
  const filteredCategories = categories
    .filter(g => formData.type === InvoiceType.OUTPUT ? g.name.includes('收入') : !g.name.includes('收入'))
    .map(g => ({
      ...g,
      subcategories: g.subcategories.filter(item => {
        // Soft Delete Rule: Hide if it starts with "(停用)", EXCEPT if it's currently selected by historical data!
        if (item === formData.category) return true;
        if (item.startsWith('(停用)')) return false;
        return true;
      })
    }))
    .filter(g => g.subcategories.length > 0); // Hide groups that become empty

  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; detail?: React.ReactNode } | null>(null);
  const [hasLastScan, setHasLastScan] = useState(false);
  const [isTaxManuallyEdited, setIsTaxManuallyEdited] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isNotARAP, setIsNotARAP] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_SCAN_KEY);
    if (saved) {
      setHasLastScan(true);
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        recordType: initialData.recordType || RecordType.BOTH,
        date: initialData.date || '',
        paymentDate: initialData.paymentDate || '',
        expectedDate: initialData.expectedDate || '',
        type: initialData.type === '銷項 (收入)' ? InvoiceType.OUTPUT : InvoiceType.INPUT,
        formatCode: initialData.formatCode || '',
        invoiceNo: initialData.invoiceNo || '',
        taxId: initialData.taxId || '',
        amount: initialData.amount || '',
        tax: initialData.tax || '',
        total: initialData.total || '',
        taxType: (TAX_TYPE_OPTIONS.find(t => initialData.taxType?.includes(t.label))?.value as TaxType) || TaxType.TAXABLE,
        deductionCode: initialData.taxType?.includes('不可扣抵') ? '4' : '1',
        category: initialData.category || '',
        note: initialData.note || ''
      });
      if (initialData.date && initialData.date === initialData.paymentDate && initialData.date === initialData.expectedDate) {
         setIsNotARAP(true);
      } else {
         setIsNotARAP(false);
      }
      setIsTaxManuallyEdited(false);
    } else {
      setFormData({
        ...INITIAL_FORM_STATE,
        date: getTaiwanDateString(),
        paymentDate: getTaiwanDateString(),
        expectedDate: getTaiwanDateString(),
      });
      setIsNotARAP(true);
      setIsTaxManuallyEdited(false);
      setMessage(null);
    }
  }, [initialData]);

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
      const total = Number(prev.total || 0);
      let tax = 0;
      let amount = total;
      
      if (newTaxType === TaxType.TAXABLE && prev.recordType !== RecordType.INTERNAL && total > 0) {
          amount = Math.round(total / 1.05);
          tax = total - amount;
      }
      
      return { ...prev, taxType: newTaxType, tax, amount, total: total || '' };
    });
    setIsTaxManuallyEdited(false);
  };

  const handleRecordTypeChange = (newRecordType: RecordType) => {
    setFormData(prev => {
      const total = Number(prev.total || 0);
      let tax = 0;
      let amount = total;

      if (prev.taxType === TaxType.TAXABLE && newRecordType !== RecordType.INTERNAL && total > 0) {
          amount = Math.round(total / 1.05);
          tax = total - amount;
      }
      return { ...prev, recordType: newRecordType, tax, amount, total: total || '' };
    });
    setIsTaxManuallyEdited(false);
  };

  const handleReset = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      date: getTaiwanDateString(),
      paymentDate: getTaiwanDateString(),
      expectedDate: getTaiwanDateString(),
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
      
      // Auto-Apply rules if category or note changes
      if ((name === 'category' || name === 'note') && newData.type === InvoiceType.INPUT) {
          const combinedText = (newData.category + ' ' + newData.note).toLowerCase();
          const isGasOrWash = combinedText.includes('旅費-交通') || combinedText.includes('油資') || combinedText.includes('加油') || combinedText.includes('洗車') || combinedText.includes('停車');
          const isEntertainment = combinedText.includes('交際費') || combinedText.includes('餐飲');
          const isWelfare = combinedText.includes('職工福利') || combinedText.includes('員工福利');
          const isTelecom = combinedText.includes('郵電費') || combinedText.includes('電話') || combinedText.includes('手機');
          const isMisc = combinedText.includes('雜項購置');
          const isInsurance = combinedText.includes('保險費');

          let newNote = newData.note;
          if (isGasOrWash && !newNote.includes('車號')) newNote = `[車號 ABC-1234] ${newNote}`.trim();
          if (isEntertainment && !newNote.includes('事由')) newNote = `[交際對象/事由: ] ${newNote}`.trim();
          if (isWelfare && !newNote.includes('事由')) newNote = `[活動事由: ] ${newNote}`.trim();
          if (isTelecom && !newNote.includes('業務聯繫')) newNote = `[負責人業務聯繫使用] ${newNote}`.trim();
          if (isMisc && !newNote.includes('工作室')) newNote = `[工作室耗材] ${newNote}`.trim();
          if (isInsurance && !newNote.includes('合約')) newNote = `[附租賃/借用合約] ${newNote}`.trim();
          newData.note = newNote;

          if (isGasOrWash || isEntertainment || isWelfare || isInsurance) {
             newData.taxType = TaxType.NON_DEDUCTIBLE;
             newData.deductionCode = '4';
             newData.recordType = RecordType.BOTH;
             newData.tax = 0;
             newData.amount = Number(newData.total || 0);
          }
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
    const newFilteredCodes = formatCodes.filter(c => newType === InvoiceType.INPUT ? (c.value.startsWith('2') || c.value === '99') : (c.value.startsWith('3') || c.value === '99'));
    const firstFormatCode = newFilteredCodes.length > 0 ? newFilteredCodes[0].value : (formatCodes.length > 0 ? formatCodes[0].value : '21');
    setFormData(prev => ({ 
      ...prev, 
      type: newType, 
      formatCode: firstFormatCode 
    }));
  };

  const setDeductionCode = (code: '1' | '4') => {
    setFormData(prev => ({ ...prev, deductionCode: code }));
  };

  // Removed markAsNonDeductibleAndFixTax as logic is now fully automated.

  const populateFormData = (data: any) => {
    console.log("Populating Form Data:", data);

    // Robust Type Detection
    const typeStr = (data.type || '').toLowerCase();
    const newType = (typeStr.includes('output') || typeStr.includes('sales')) 
        ? InvoiceType.OUTPUT 
        : InvoiceType.INPUT;

    // Robust Format Code
    let newFormatCode = data.formatCode;
    const newFilteredCodes = formatCodes.filter(c => newType === InvoiceType.INPUT ? (c.value.startsWith('2') || c.value === '99') : (c.value.startsWith('3') || c.value === '99'));
    const validCodes = newFilteredCodes.map(o => o.value);
    
    if (!validCodes.includes(newFormatCode)) {
      newFormatCode = validCodes.length > 0 ? validCodes[0] : '21'; 
      if (newType === InvoiceType.INPUT && data.taxId && validCodes.includes('25')) {
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
      const state = {
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

      if (state.type === InvoiceType.INPUT) {
          const combinedText = (state.category + ' ' + state.note).toLowerCase();
          const isGasOrWash = combinedText.includes('旅費-交通') || combinedText.includes('油資') || combinedText.includes('加油') || combinedText.includes('洗車') || combinedText.includes('停車');
          const isEntertainment = combinedText.includes('交際費') || combinedText.includes('餐飲');
          const isWelfare = combinedText.includes('職工福利') || combinedText.includes('員工福利');
          const isTelecom = combinedText.includes('郵電費') || combinedText.includes('電話') || combinedText.includes('手機');
          const isMisc = combinedText.includes('雜項購置');
          const isInsurance = combinedText.includes('保險費');

          let newNote = state.note;
          if (isGasOrWash && !newNote.includes('車號')) newNote = `[車號 ABC-1234] ${newNote}`;
          if (isEntertainment && !newNote.includes('事由')) newNote = `[交際對象/事由: ] ${newNote}`;
          if (isWelfare && !newNote.includes('事由')) newNote = `[活動事由: ] ${newNote}`;
          if (isTelecom && !newNote.includes('業務聯繫')) newNote = `[負責人業務聯繫使用] ${newNote}`;
          if (isMisc && !newNote.includes('工作室')) newNote = `[工作室耗材] ${newNote}`;
          if (isInsurance && !newNote.includes('合約')) newNote = `[附租賃/借用合約] ${newNote}`;
          state.note = newNote.trim();

          if (isGasOrWash || isEntertainment || isWelfare || isInsurance) {
             state.taxType = TaxType.NON_DEDUCTIBLE;
             state.deductionCode = '4';
             state.recordType = RecordType.BOTH;
             state.tax = 0;
             state.amount = Number(state.total || 0);
          }
      }
      return state as InvoiceFormState;
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

    const isRequiredInTW = ['21', '31', '25'].includes(formData.formatCode);
    const isBothMode = formData.recordType === RecordType.BOTH;

    if (isBothMode && isRequiredInTW && !formData.taxId) {
        setMessage({ type: 'error', text: '此格式代號必須輸入統編 (Tax ID)' });
        return;
    }
    
    if (formData.taxId && !isValidTaiwanTaxId(formData.taxId) && formData.formatCode !== '99') {
        setMessage({ type: 'error', text: '統編格式錯誤', detail: '請檢查 8 碼統編是否正確' });
        return;
    }

    // Priority 2: Mathematical Validation for Specific Format Codes
    const amt = Number(formData.amount) || 0;
    const tax = Number(formData.tax) || 0;
    const tot = Number(formData.total) || 0;
    
    // Exclude '99' (No Invoice) from strict math validation
    if (formData.formatCode !== '99') {
        if (Math.abs((amt + tax) - tot) > 0.001) {
            setMessage({ 
                type: 'error', 
                text: '金額計算錯誤', 
                detail: '銷售額與稅額加總不等於總額，請再次核對實體發票！' 
            });
            return;
        }
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
      action: initialData ? 'update' : 'submit',
      secret: config.apiSecret,
      userEmail: config.userEmail,
      id: initialData ? initialData.id : undefined,
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
        setMessage({ type: 'success', text: `成功${initialData ? '更新' : '錄入'}!` });
        if (initialData && onClearEdit) {
           setTimeout(() => onClearEdit(true), 1500);
        } else {
          setFormData(prev => ({
            ...INITIAL_FORM_STATE,
            date: prev.date,
            type: prev.type,
            formatCode: prev.formatCode,
            paymentDate: isNotARAP ? prev.date : '',
            expectedDate: isNotARAP ? prev.date : '',
          }));
        }
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

  const isTaxIdValid = formData.recordType === RecordType.INTERNAL || 
                       formData.formatCode === '99' || 
                       formData.taxId === '' || 
                       isValidTaiwanTaxId(formData.taxId);

  // Show descriptive tip if it was automatically set to non-deductible
  const showNonDeductibleTip = formData.type === InvoiceType.INPUT && formData.taxType === TaxType.NON_DEDUCTIBLE;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {showScanner && <Scanner onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      
      <form onSubmit={handlePreSubmit} noValidate className="space-y-6">
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
                僅內帳 <br />(無憑證/不報稅)
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
                hideIconOnMobile={true}
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
                  hideIconOnMobile={true}
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
                hideIconOnMobile={true}
              />
            </div>

            <Select
              id="formatCode"
              name="formatCode"
              label="格式代號"
              value={formData.formatCode}
              onChange={handleChange}
              options={filteredFormatCodes.length > 0 ? filteredFormatCodes : [{value: formData.formatCode, label: formData.formatCode}]}
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
                  label={formData.type === InvoiceType.OUTPUT ? "買受人統編" : "賣方統編"}
                  placeholder="8位數字"
                  value={formData.taxId}
                  onChange={handleChange}
                  maxLength={8}
                  error={!isTaxIdValid ? "統編邏輯錯誤" : ""}
                  required={formData.recordType !== RecordType.INTERNAL && ['21', '31', '25'].includes(formData.formatCode)}
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
              <div className="grid grid-cols-1 gap-4">
                 <Select
                  id="taxType"
                  name="taxType"
                  label="1. 應稅/零稅/免稅"
                  value={formData.taxType}
                  onChange={handleTaxTypeChange}
                  options={TAX_TYPE_OPTIONS}
                />
              </div>

              {formData.type === InvoiceType.INPUT && formData.taxType === TaxType.TAXABLE && formData.recordType !== RecordType.INTERNAL && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <div className="block font-medium text-slate-400 text-xs mb-2">2. 可扣抵 / 不可扣抵</div>
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
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/50">
                <Input
                  id="total"
                  name="total"
                  type="number"
                  label="3. 總金額 (含稅總價)"
                  placeholder="0"
                  value={formData.total}
                  onChange={handleTotalChange}
                  required
                  icon={DollarSign}
                  className="font-mono text-xl tracking-tight font-bold text-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  label="支付金額 (未稅)"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  required
                  icon={DollarSign}
                  className="font-mono text-lg tracking-tight"
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
              
              {showNonDeductibleTip && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-sky-300 text-sm flex gap-3 items-start">
                     <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                     <div className="space-y-1 flex-1">
                       <p className="font-bold">AI 稅務顧問提醒 💡</p>
                       <p className="opacity-90 text-xs text-sky-200/80">依據稅法規定，此類別（如交際、福利、小汽車相關等）進項憑證不可扣抵營業稅。系統已自動將憑證註記為「不計稅 / 不可扣抵」，並會將稅額併入成本供後續依規定入列公司開支。</p>
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
                        {filteredCategories.map((group) => (
                          <optgroup key={group.id} label={group.name} className="bg-slate-900">
                            {group.subcategories.map((item) => (
                              <option key={item} value={item}>
                                {item}
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

        <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-slate-950/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-slate-800 md:border-none z-40 md:z-auto safe-area-bottom mt-0 md:mt-8">
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:flex md:flex-row items-center gap-3 md:gap-4 md:justify-center">
                <Button 
                    type="submit" 
                    className="w-full md:w-[220px] py-3 md:py-3 md:px-8 text-base font-bold shadow-lg shadow-sky-900/20"
                    isLoading={loading}
                    icon={Save}
                >
                    確認送出
                </Button>
                
                {initialData ? (
                  <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => onClearEdit && onClearEdit(false)}
                      icon={RotateCcw}
                      disabled={loading}
                      className="w-full md:w-[220px] py-3 md:py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                  >
                      取消編輯返回
                  </Button>
                ) : (
                  <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setShowResetConfirm(true)}
                      icon={RotateCcw}
                      disabled={loading}
                      className="w-full md:w-[220px] py-3 md:py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                  >
                      重置空表單
                  </Button>
                )}

                {message && (
                    <div className={`col-span-2 w-full md:col-auto md:flex-1 px-4 py-2 rounded-lg text-sm font-medium flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-left-2 ${
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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-rose-500/20 p-2 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white">確認重置？</h3>
            </div>
            
            <div className="p-5 text-sm text-slate-300">
              <p>您確定要清空目前所有已輸入的資料嗎？此動作無法復原。</p>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
              >
                取消
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
                onClick={() => {
                  handleReset();
                  setShowResetConfirm(false);
                }}
              >
                確定重置
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
                  <span className="text-slate-200 font-medium">{formData.category}</span>
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