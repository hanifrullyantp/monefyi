import { Pencil } from 'lucide-react';

interface EditableTextProps {
  value: string;
  editMode: boolean;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
}

export default function EditableText({
  value,
  editMode,
  onChange,
  className = '',
  multiline = false,
  as: Tag = 'span',
}: EditableTextProps) {
  if (!editMode) {
    const lines = value.split('\n');
    if (lines.length > 1) {
      return (
        <Tag className={className}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </Tag>
      );
    }
    return <Tag className={className}>{value}</Tag>;
  }

  const shared =
    'w-full rounded-lg border border-emerald-400/50 bg-emerald-950/40 text-inherit px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

  return (
    <span className={`relative group inline-block w-full ${className}`}>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className={`${shared} resize-y min-h-[4rem]`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={shared}
        />
      )}
      <Pencil className="w-3 h-3 text-emerald-300 absolute -top-1 -right-1 opacity-70 pointer-events-none" />
    </span>
  );
}
