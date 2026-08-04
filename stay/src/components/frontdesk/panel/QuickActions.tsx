import { useState } from 'react';
import {
  Ban,
  Brush,
  CalendarPlus,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  MessageCircle,
  Receipt,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { RoomStatus, type RoomCardData } from '../../../types/frontdesk.types';
import type { RoomActionKey } from '../../../hooks/useRoomActions';
import type { RoomDetailContext } from '../../../utils/roomDetailHelpers';
import PanelActionButton from './PanelActionButton';
import { ConfirmModal } from '../../ui/Modal';

export interface QuickActionsProps {
  context: RoomDetailContext;
  loadingAction: RoomActionKey | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onExtendStay: () => void;
  onPayment: () => void;
  onAssignCleaning: () => void;
  onMarkClean: () => void;
  onMarkCleaning: () => void;
  onBlockRoom: () => void;
  onSendWA: () => void;
  onSendReminder: () => void;
  onMarkMaintenanceDone: () => void;
  onCancelBooking: () => void;
  onNewBooking: () => void;
  onViewBooking: () => void;
  onPos: () => void;
}

export default function QuickActions({
  context,
  loadingAction,
  onCheckIn,
  onCheckOut,
  onExtendStay,
  onPayment,
  onAssignCleaning,
  onMarkClean,
  onMarkCleaning,
  onBlockRoom,
  onSendWA,
  onSendReminder,
  onMarkMaintenanceDone,
  onCancelBooking,
  onNewBooking,
  onViewBooking,
  onPos,
}: QuickActionsProps) {
  const { room } = context;
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => void;
    variant?: 'danger' | 'primary';
  } | null>(null);

  const askConfirm = (
    title: string,
    message: string,
    action: () => void,
    variant: 'danger' | 'primary' = 'danger'
  ) => {
    setConfirm({ title, message, action, variant });
  };

  const renderByStatus = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE:
        return (
          <>
            <PanelActionButton
              label="Buat Booking"
              icon={<CalendarPlus className="h-5 w-5" />}
              variant="primary"
              loading={loadingAction === 'checkIn'}
              onClick={onNewBooking}
            />
            <PanelActionButton
              label="Blokir Kamar"
              icon={<Ban className="h-5 w-5" />}
              variant="danger"
              loading={loadingAction === 'blockRoom'}
              onClick={() =>
                askConfirm('Blokir kamar?', 'Kamar tidak akan bisa dijual.', onBlockRoom)
              }
            />
          </>
        );

      case RoomStatus.RESERVED:
        return (
          <>
            <PanelActionButton
              label="Proses Check-in"
              icon={<LogIn className="h-5 w-5" />}
              variant="primary"
              loading={loadingAction === 'checkIn'}
              onClick={onCheckIn}
            />
            <PanelActionButton
              label="Lihat Detail Booking"
              icon={<FileText className="h-5 w-5" />}
              onClick={onViewBooking}
            />
            <PanelActionButton
              label="Batalkan Booking"
              icon={<XCircle className="h-5 w-5" />}
              variant="danger"
              loading={loadingAction === 'cancelBooking'}
              onClick={() =>
                askConfirm('Batalkan booking?', 'Aksi ini tidak dapat dibatalkan.', onCancelBooking)
              }
            />
            <PanelActionButton
              label="Kirim WA ke Tamu"
              icon={<MessageCircle className="h-5 w-5" />}
              loading={loadingAction === 'sendWA'}
              onClick={onSendWA}
            />
          </>
        );

      case RoomStatus.OCCUPIED:
        return (
          <>
            <PanelActionButton
              label="Proses Check-out"
              icon={<LogOut className="h-5 w-5" />}
              variant="warning"
              loading={loadingAction === 'checkOut'}
              onClick={() =>
                askConfirm('Proses checkout?', 'Kamar akan berstatus dirty.', onCheckOut, 'primary')
              }
            />
            <PanelActionButton
              label="Extend Stay"
              icon={<CalendarPlus className="h-5 w-5" />}
              loading={loadingAction === 'extendStay'}
              onClick={onExtendStay}
            />
            <PanelActionButton
              label="Tambah Item ke Tagihan"
              icon={<Receipt className="h-5 w-5" />}
              onClick={onPos}
            />
            <PanelActionButton
              label="Terima Pembayaran"
              icon={<CreditCard className="h-5 w-5" />}
              variant="primary"
              loading={loadingAction === 'payment'}
              onClick={onPayment}
            />
            <PanelActionButton
              label="Kirim WA"
              icon={<MessageCircle className="h-5 w-5" />}
              loading={loadingAction === 'sendWA'}
              onClick={onSendWA}
            />
          </>
        );

      case RoomStatus.UNPAID:
        return (
          <>
            <PanelActionButton
              label="Terima Pembayaran"
              icon={<CreditCard className="h-5 w-5" />}
              variant="primary"
              className="min-h-[72px] col-span-2"
              loading={loadingAction === 'payment'}
              onClick={onPayment}
            />
            <PanelActionButton
              label="Kirim Reminder WA"
              icon={<MessageCircle className="h-5 w-5" />}
              variant="warning"
              loading={loadingAction === 'sendReminder'}
              onClick={onSendReminder}
            />
            <PanelActionButton
              label="Lihat Invoice"
              icon={<FileText className="h-5 w-5" />}
              onClick={onPos}
            />
            <PanelActionButton
              label="Batalkan Booking"
              icon={<XCircle className="h-5 w-5" />}
              variant="danger"
              loading={loadingAction === 'cancelBooking'}
              onClick={() =>
                askConfirm('Batalkan booking?', 'Pastikan kebijakan cancel diterapkan.', onCancelBooking)
              }
            />
          </>
        );

      case RoomStatus.DIRTY:
        return (
          <>
            <PanelActionButton
              label="Tandai Sedang Dibersihkan"
              icon={<Brush className="h-5 w-5" />}
              loading={loadingAction === 'markCleaning'}
              onClick={onMarkCleaning}
            />
            <PanelActionButton
              label="Tandai Sudah Bersih"
              icon={<Sparkles className="h-5 w-5" />}
              variant="primary"
              loading={loadingAction === 'markClean'}
              onClick={onMarkClean}
            />
            <PanelActionButton
              label="Assign Petugas"
              icon={<Brush className="h-5 w-5" />}
              loading={loadingAction === 'assignCleaning'}
              onClick={onAssignCleaning}
            />
          </>
        );

      case RoomStatus.MAINTENANCE:
        return (
          <>
            <PanelActionButton
              label="Tandai Selesai"
              icon={<Wrench className="h-5 w-5" />}
              variant="primary"
              loading={loadingAction === 'markMaintenanceDone'}
              onClick={onMarkMaintenanceDone}
            />
            <PanelActionButton
              label="Edit Catatan Perbaikan"
              icon={<FileText className="h-5 w-5" />}
              onClick={() => {}}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="quick-actions-heading">
      <h3 id="quick-actions-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Aksi Cepat
      </h3>
      <div className="grid grid-cols-2 gap-2">{renderByStatus(room.status)}</div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.action();
          setConfirm(null);
        }}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        variant={confirm?.variant ?? 'danger'}
      />
    </section>
  );
}
