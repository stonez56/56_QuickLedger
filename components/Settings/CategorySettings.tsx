import React, { useState } from 'react';
import { useConfig, Category } from '../../contexts/ConfigContext';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { Button, Input, Card } from '../UI';

export const CategorySettings: React.FC = () => {
  const { categories, saveCategories, isLoading } = useConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({ ...category, subcategories: [...category.subcategories] });
    setError('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
    setError('');
  };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.name.trim()) {
      setError('類別名稱不能為空');
      return;
    }
    
    setIsSaving(true);
    setError('');
    try {
      let newCategories = [...categories];
      
      if (editingId === 'new') {
        newCategories.push(editForm);
      } else {
        const index = newCategories.findIndex(c => c.id === editingId);
        if (index !== -1) {
          newCategories[index] = editForm;
        }
      }
      
      await saveCategories(newCategories);
      sessionStorage.removeItem('dashboard_records_cache'); // Invalidate stats cache
      setEditingId(null);
      setEditForm(null);
    } catch (e: any) {
      setError(e.message || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此大類別嗎？這也將刪除其下所有子科目。')) return;
    
    setIsSaving(true);
    try {
      const newCategories = categories.filter(c => c.id !== id);
      await saveCategories(newCategories);
      sessionStorage.removeItem('dashboard_records_cache'); // Invalidate stats cache
    } catch (e: any) {
      alert(e.message || '刪除失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    const newId = 'cat_' + Date.now();
    setEditingId('new');
    setEditForm({ id: newId, name: '', subcategories: [] });
    setError('');
  };

  const addSubcategory = () => {
    if (editForm) {
      setEditForm({
        ...editForm,
        subcategories: [...editForm.subcategories, '']
      });
    }
  };

  const updateSubcategory = (index: number, value: string) => {
    if (editForm) {
      const newSubs = [...editForm.subcategories];
      newSubs[index] = value;
      setEditForm({ ...editForm, subcategories: newSubs });
    }
  };

  const removeSubcategory = (index: number) => {
    if (editForm) {
      const newSubs = editForm.subcategories.filter((_, i) => i !== index);
      setEditForm({ ...editForm, subcategories: newSubs });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center">
             會計科目設定
          </h2>
          <p className="text-sm text-slate-400 mt-1">
             管理表單中可選的會計科目大類與子項目
          </p>
        </div>
        <Button onClick={handleAddNew} icon={Plus} size="sm" disabled={editingId !== null || isLoading}>
          新增大類別
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading && categories.length === 0 ? (
          <div className="p-12 text-center text-slate-500">載入中...</div>
        ) : categories.map(category => (
          <Card key={category.id} className="p-4 bg-slate-900">
            {editingId === category.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <Input 
                       label="主類別名稱 (如: 🚀 交通與通訊)" 
                       value={editForm?.name || ''} 
                       onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                       disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2 pl-4 border-l-2 border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-400">子科目列表</label>
                    <Button variant="ghost" size="sm" onClick={addSubcategory} icon={Plus} disabled={isSaving}>新增子科目</Button>
                  </div>
                  
                  {editForm?.subcategories.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <GripVertical size={16} className="text-slate-600 cursor-grab" />
                      <Input 
                        value={sub}
                        onChange={e => updateSubcategory(idx, e.target.value)}
                        placeholder="子科目名稱"
                        className="flex-1 !py-1.5"
                        disabled={isSaving}
                      />
                      <button 
                        onClick={() => removeSubcategory(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"
                        disabled={isSaving}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {editForm?.subcategories.length === 0 && (
                     <div className="text-sm text-slate-500 italic py-2">目前沒有子科目</div>
                  )}
                </div>

                {error && <p className="text-sm text-rose-500">{error}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>取消</Button>
                  <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} icon={Save}>儲存</Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-lg text-slate-200">{category.name}</h3>
                  <div className="flex gap-1">
                    <button 
                       onClick={() => handleEdit(category)}
                       className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                       disabled={editingId !== null || isLoading}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                       onClick={() => handleDelete(category.id)}
                       className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                       disabled={editingId !== null || isLoading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-4">
                  {category.subcategories.map((sub, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-md text-sm text-slate-300">
                      {sub}
                    </span>
                  ))}
                  {category.subcategories.length === 0 && (
                    <span className="text-sm text-slate-500 italic">無子科目</span>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* New Category Form (when editingId === 'new') */}
        {editingId === 'new' && (
          <Card className="p-4 bg-slate-900 border-sky-500/50">
             <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <Input 
                       label="主類別名稱 (如: 🚀 交通與通訊)" 
                       value={editForm?.name || ''} 
                       onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                       disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2 pl-4 border-l-2 border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-400">子科目列表</label>
                    <Button variant="ghost" size="sm" onClick={addSubcategory} icon={Plus} disabled={isSaving}>新增子科目</Button>
                  </div>
                  
                  {editForm?.subcategories.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <GripVertical size={16} className="text-slate-600 cursor-grab" />
                      <Input 
                        value={sub}
                        onChange={e => updateSubcategory(idx, e.target.value)}
                        placeholder="子科目名稱"
                        className="flex-1 !py-1.5"
                        disabled={isSaving}
                      />
                      <button 
                        onClick={() => removeSubcategory(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"
                        disabled={isSaving}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {editForm?.subcategories.length === 0 && (
                     <div className="text-sm text-slate-500 italic py-2">目前沒有子科目</div>
                  )}
                </div>

                {error && <p className="text-sm text-rose-500">{error}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>取消</Button>
                  <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} icon={Save}>儲存</Button>
                </div>
              </div>
          </Card>
        )}
      </div>
    </div>
  );
};
