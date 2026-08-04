import { useCallback, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { RoomCardData } from '../../types/frontdesk.types';
import type { RoomStatus as DbRoomStatus } from '../../types';
import { cn } from '../../utils/cn';
import { ROOM_INLINE_STATUS_OPTIONS } from '../../utils/roomInlineEdit';

export interface RoomCardInlineEditProps {
  room: RoomCardData;
  compact?: boolean;
  onDone: (message: string) => void;
  onCancel: () => void;
}

/**
 * Form inline edit status & catatan kamar — langsung di kartu Front Desk.
 */
export default function RoomCardInlineEdit({
  room,
  compact = false,
  onDone,
  onCancel,
}: RoomCardInlineEditProps) {
  const updateRoom = useAppStore((s) => s.updateRoom);
  const entity = useAppStore((s) => s.rooms.find((r) => r.id === room.id));

  const [status, setStatus] = useState<DbRoomStatus>(
    (entity?.status ?? room.rawStatus) as DbRoomStatus
  );
  const [notes, setNotes] = useState(entity?.notes ?? room.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      updateRoom(room.id, {
        status,
        notes: notes.trim() || undefined,
      });
      onDone('Kamar berhasil diperbarui');
    } catch {
      onDone('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  }, [room.id, status, notes, updateRoom, onDone]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/98 p-2 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/98"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid={`room-inline-edit-${room.number}`}
    >
      <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
        Edit Kamar {room.number}
      </p>

      <div className={cn('flex flex-wrap gap-1', compact && 'gap-0.5')}>
        {ROOM_INLINE_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => setStatus(opt.value)}
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-[9px] font-bold transition-colors sm:px-2 sm:py-1 sm:text-[10px]',
              status === opt.value
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300'
            )}
          >
            {compact ? opt.short : opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Catatan kamar (opsional)"
        rows={compact ? 1 : 2}
        className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Check className="h-3 w-3" />
          Simpan
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
