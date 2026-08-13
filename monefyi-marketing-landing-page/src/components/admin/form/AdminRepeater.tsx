/** src/components/admin/form/AdminRepeater.tsx */
import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { AdminInput } from './AdminInput';
import { AdminTextarea } from './AdminTextarea';
import { AdminSelect } from './AdminSelect';
import { AdminToggle } from './AdminToggle';

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "toggle";
  options?: { value: string; label: string }[];
}

interface AdminRepeaterProps {
  label: string;
  items: any[];
  onChange: (items: any[]) => void;
  fields: FieldConfig[];
  addLabel?: string;
  maxItems?: number;
}

export function AdminRepeater({
  label,
  items,
  onChange,
  fields,
  addLabel = "Tambah Item",
  maxItems = 10
}: AdminRepeaterProps) {
  
  const handleAddItem = () => {
    if (items.length >= maxItems) return;
    const newItem = fields.reduce((acc: any, field) => {
      acc[field.key] = field.type === 'toggle' ? false : '';
      return acc;
    }, {});
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleUpdateItem = (index: number, key: string, value: any) => {
    const newItems = items.map((item, i) => 
      i === index ? { ...item, [key]: value } : item
    );
    onChange(newItems);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{label}</label>
        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full">{items.length} / {maxItems}</span>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Item {index + 1}</span>
              <button 
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:text-red-400 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {fields.map((field) => {
                switch (field.type) {
                  case 'textarea':
                    return <AdminTextarea key={field.key} label={field.label} value={item[field.key]} onChange={(v) => handleUpdateItem(index, field.key, v)} rows={3} />;
                  case 'select':
                    return <AdminSelect key={field.key} label={field.label} value={item[field.key]} options={field.options || []} onChange={(v) => handleUpdateItem(index, field.key, v)} />;
                  case 'toggle':
                    return <AdminToggle key={field.key} label={field.label} checked={item[field.key]} onChange={(v) => handleUpdateItem(index, field.key, v)} />;
                  default:
                    return <AdminInput key={field.key} label={field.label} value={item[field.key]} onChange={(v) => handleUpdateItem(index, field.key, v)} />;
                }
              })}
            </div>
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          onClick={handleAddItem}
          className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-green-500 hover:border-green-500/50 transition-all flex items-center justify-center gap-2 text-sm font-bold"
        >
          <Plus size={18} /> {addLabel}
        </button>
      )}
    </div>
  );
}
