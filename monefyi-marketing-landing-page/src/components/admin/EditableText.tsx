import React, { useState, useRef, useEffect } from 'react';
import { useAdminMode } from '../../hooks/useAdminMode';
import { useGlobalDraft } from '../../hooks/useGlobalDraft';
import { cn } from '../../lib/cn';

interface EditableTextProps {
  id: string;
  defaultValue: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  multiline?: boolean;
}

export function EditableText({ id, defaultValue, as: Tag = 'span', className, multiline = false }: EditableTextProps): React.ReactElement {
  const isAdmin = useAdminMode();
  const { draft, updateDraft } = useGlobalDraft();
  
  // Use the value from draft if it exists, otherwise use defaultValue
  const currentValue = draft[id] !== undefined ? draft[id] : defaultValue;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Keep internal state in sync with external draft (for undo/redo support)
  useEffect(() => {
    setEditValue(currentValue);
  }, [currentValue]);

  const handleCommit = () => {
    if (editValue !== currentValue) {
      updateDraft(id, editValue);
    }
    setIsEditing(false);
  };

  if (!isAdmin) {
    return <Tag className={className}>{currentValue}</Tag>;
  }

  if (isEditing) {
    const commonStyles = "bg-amber-900/90 border-2 border-amber-400 text-white focus:outline-none selection:bg-amber-500/30";
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={e => { 
            if (e.key === 'Escape') {
              setEditValue(currentValue);
              setIsEditing(false);
            }
          }}
          className={cn(commonStyles, 'rounded-xl p-4 w-full h-full min-h-[100px] block', className)}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={e => { 
          if (e.key === 'Enter') handleCommit(); 
          if (e.key === 'Escape') {
            setEditValue(currentValue);
            setIsEditing(false);
          }
        }}
        className={cn(commonStyles, 'rounded-lg px-2 py-0.5 w-full inline-block', className)}
        autoFocus
      />
    );
  }

  return (
    <Tag
      className={cn(
        'relative group/edit cursor-pointer transition-all duration-200 inline-block min-w-[20px]',
        'outline-1 outline-dashed outline-transparent hover:outline-amber-400/50 hover:bg-amber-400/5 rounded-sm',
        className
      )}
      onClick={(e) => { 
        e.stopPropagation();
        setIsEditing(true); 
      }}
    >
      {currentValue || <span className="opacity-30 italic">Empty text</span>}
      <span className="absolute -top-6 left-0 bg-amber-400 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/edit:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none uppercase tracking-tighter shadow-md">
        Edit {id.split('_').pop()}
      </span>
    </Tag>
  );
}
