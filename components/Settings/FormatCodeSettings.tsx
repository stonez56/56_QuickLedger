import React, { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { Button, Input, Card } from '../UI';

export const FormatCodeSettings: React.FC = () => {
  const { formatCodes, saveFormatCodes, isLoading } = useConfig();
  const [editingIndex, setEditingIndex] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<{ value: string; label: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (index: number, code: { value: string; label: string }) => {
    setEditingIndex(index);
    setEditForm({ ...code });
    setError('');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
    setError('');
  };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.value.trim() || !editForm.label.trim()) {
      setError('代號與說明不能為空');
      return;
    }
    
    // Check for duplicate value
    if (editingIndex === 'new' && formatCodes.some(c => c.value === editForm.value)) {
        setError('代號已存在');
        return;
    }
    
    setIsSaving(true);
    setError('');
    try {
      let newCodes = [...formatCodes];
      
      if (editingIndex === 'new') {
        newCodes.push(editForm);
      } else {
        newCodes[editingIndex] = editForm;
      }
      
      await saveFormatCodes(newCodes);
      setEditingIndex(null);
      setEditForm(null);
    } catch (e: any) {
      setError(e.message || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!window.confirm('確定要刪除此格式代號嗎？')) return;
    
    setIsSaving(true);
    try {
      const newCodes = formatCodes.filter((_, i) => i !== index);
      await saveFormatCodes(newCodes);
    } catch (e: any) {
      alert(e.message || '刪除失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    setEditingIndex('new');
    setEditForm({ value: '', label: '' });
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center">
             格式代號設定
          </h2>
          <p className="text-sm text-slate-400 mt-1">
             管理表單中可選的發票/收據格式代號
          </p>
        </div>
        <Button onClick={handleAddNew} icon={Plus} size="sm" disabled={editingIndex !== null || isLoading}>
          新增代號
        </Button>
      </div>

      <Card className="bg-slate-900 overflow-hidden">
        {isLoading && formatCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-500">載入中...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {formatCodes.map((code, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors">
                {editingIndex === idx ? (
                  // Edit Mode
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <Input 
                        placeholder="代號 (如: 21)" 
                        value={editForm?.value || ''} 
                        onChange={e => setEditForm(prev => prev ? { ...prev, value: e.target.value } : null)}
                        className="w-full md:w-32 !py-1.5"
                        disabled={isSaving}
                    />
                    <Input 
                        placeholder="說明 (如: 21 進項 三聯式)" 
                        value={editForm?.label || ''} 
                        onChange={e => setEditForm(prev => prev ? { ...prev, label: e.target.value } : null)}
                        className="flex-1 !py-1.5 w-full"
                        disabled={isSaving}
                    />
                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>取消</Button>
                      <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>儲存</Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <span className="font-mono bg-slate-800 text-sky-400 px-2 py-1 rounded text-sm w-12 text-center">
                            {code.value}
                        </span>
                        <span className="text-slate-300">
                            {code.label}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <button 
                        onClick={() => handleEdit(idx, code)}
                        className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                        disabled={editingIndex !== null || isLoading}
                        >
                        <Edit2 size={16} />
                        </button>
                        <button 
                        onClick={() => handleDelete(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                        disabled={editingIndex !== null || isLoading}
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* New Form */}
            {editingIndex === 'new' && (
              <div className="p-4 bg-sky-950/20 border-l-2 border-sky-500">
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <Input 
                        placeholder="代號 (如: 21)" 
                        value={editForm?.value || ''} 
                        onChange={e => setEditForm(prev => prev ? { ...prev, value: e.target.value } : null)}
                        className="w-full md:w-32 !py-1.5"
                        disabled={isSaving}
                    />
                    <Input 
                        placeholder="說明 (如: 21 進項 三聯式)" 
                        value={editForm?.label || ''} 
                        onChange={e => setEditForm(prev => prev ? { ...prev, label: e.target.value } : null)}
                        className="flex-1 !py-1.5 w-full"
                        disabled={isSaving}
                    />
                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>取消</Button>
                      <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>儲存</Button>
                    </div>
                </div>
                {error && <p className="text-sm text-rose-500 mt-2">{error}</p>}
              </div>
            )}
            
            {formatCodes.length === 0 && editingIndex !== 'new' && !isLoading && (
                 <div className="p-8 text-center text-slate-500 italic">目前沒有任何格式代號</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
