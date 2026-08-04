import { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useFrontDeskStore } from '../../stores/frontDeskStore';
import { useRoomActions, type ToastFn } from '../../hooks/useRoomActions';
import { buildRoomDetailContext } from '../../utils/roomDetailHelpers';
import { mapRoomsToCardData } from '../../utils/mapRoomsToCardData';
import { formatFloorName } from '../../utils/mapRoomsToCardData';
import { getStatusDefinition } from '../../constants/roomStatus';
import { RoomStatus } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';
import Sheet, { SheetBody, SheetHeader } from '../ui/Sheet';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import RoomCardBadge from './RoomCardBadge';
import GuestInfoSection from './panel/GuestInfoSection';
import StayTimeline from './panel/StayTimeline';
import PaymentSection from './panel/PaymentSection';
import RoomFacilities from './panel/RoomFacilities';
import ActivityTimeline from './panel/ActivityTimeline';
import QuickActions from './panel/QuickActions';

export interface RoomDetailPanelProps {
  onToast?: ToastFn;
}

/**
 * Side panel detail kamar — rich info + quick actions.
 */
export default function RoomDetailPanel({ onToast }: RoomDetailPanelProps) {
  const { selectedRoom, isDetailPanelOpen, closeDetailPanel } =
    useFrontDeskStore();
  const { rooms, bookings, payments } = useAppStore();
  const actions = useRoomActions(onToast);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const liveCard = useMemo(() => {
    if (!selectedRoom) return null;
    return mapRoomsToCardData(rooms, bookings).find((r) => r.id === selectedRoom.id) ?? selectedRoom;
  }, [selectedRoom, rooms, bookings]);

  const context = useMemo(() => {
    if (!liveCard) return null;
    return buildRoomDetailContext(liveCard, rooms, bookings, payments);
  }, [liveCard, rooms, bookings, payments]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [selectedRoom?.id]);

  const handleClose = useCallback(() => {
    closeDetailPanel();
  }, [closeDetailPanel]);

  const booking = context?.booking;
  const cardBooking = liveCard?.activeBooking ?? liveCard?.upcomingBooking;
  const statusDef = liveCard ? getStatusDefinition(liveCard.status) : null;

  const photos =
    context?.photos.length ? context.photos : ['/stay/placeholder-room.jpg'];

  const defaultPaymentAmount = cardBooking?.balanceDue ?? 0;

  const handlePaymentSubmit = async () => {
    if (!booking) return;
    const amount = Number(paymentAmount.replace(/\D/g, '')) || defaultPaymentAmount;
    const result = await actions.handlePayment(booking.id, amount);
    if (result.success) {
      setShowPaymentModal(false);
      setPaymentAmount('');
    }
  };

  if (!liveCard || !context) return null;

  return (
    <>
      <Sheet
        open={isDetailPanelOpen}
        onOpenChange={(open) => !open && handleClose()}
        aria-label={`Detail kamar ${liveCard.number}`}
        data-testid="room-detail-panel"
      >
        <SheetHeader onClose={handleClose}>
          <div className="relative h-[200px] w-full overflow-hidden bg-gray-100">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIndex] ?? photos[0]}
                  alt={`Foto kamar ${liveCard.number}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5"
                      aria-label="Foto sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5"
                      aria-label="Foto berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700">
                <span className="text-6xl font-black">{liveCard.number}</span>
              </div>
            )}
          </div>
        </SheetHeader>

        <SheetBody className="px-5 pb-8 pt-4">
          <div className="mb-6 space-y-2">
            <p className="text-4xl font-black text-gray-900">{liveCard.number}</p>
            <div className="flex flex-wrap items-center gap-2">
              {statusDef && (
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-bold uppercase',
                    statusDef.colors.bgClass,
                    statusDef.colors.borderClass,
                    statusDef.colors.textClass
                  )}
                >
                  {statusDef.label}
                </span>
              )}
              <RoomCardBadge
                variant={
                  liveCard.status === RoomStatus.UNPAID
                    ? 'unpaid'
                    : liveCard.status === RoomStatus.DIRTY
                      ? 'dirty'
                      : 'paid'
                }
              />
            </div>
            <p className="text-sm font-semibold text-gray-600">
              {liveCard.roomTypeName} · {formatFloorName(liveCard.floor)}
            </p>
          </div>

          <div className="space-y-8">
            <GuestInfoSection
              booking={booking}
              loyaltyTier={context.loyaltyTier}
            />

            {cardBooking &&
              (liveCard.status === RoomStatus.OCCUPIED ||
                liveCard.status === RoomStatus.UNPAID) && (
                <StayTimeline
                  booking={cardBooking}
                  progress={liveCard.stayProgress}
                  remainingLabel={context.remainingLabel}
                />
              )}

            {cardBooking && (
              <PaymentSection
                booking={cardBooking}
                payments={context.payments}
                onAddPayment={() => {
                  setPaymentAmount(String(defaultPaymentAmount));
                  setShowPaymentModal(true);
                }}
                onViewInvoice={() => booking && actions.goToPos(booking.id)}
                onSendInvoiceWA={() => {
                  if (booking?.guest?.phone) {
                    actions.handleSendWA(
                      booking.guest.phone,
                      `Invoice booking ${booking.bookingCode} kamar ${liveCard.number}`
                    );
                  }
                }}
              />
            )}

            <RoomFacilities room={liveCard} capacity={context.capacity} />
            <ActivityTimeline roomId={liveCard.id} />

            <QuickActions
              context={context}
              loadingAction={actions.loadingAction}
              onCheckIn={() => {
                const b = liveCard.upcomingBooking;
                if (b) actions.handleCheckIn(b.id, liveCard.id);
              }}
              onCheckOut={() => {
                const b = liveCard.activeBooking;
                if (b && booking) {
                  actions.handleCheckOut(
                    b.id,
                    liveCard.id,
                    booking.guest?.phone,
                    booking.guest?.name,
                    b.bookingCode
                  );
                }
              }}
              onExtendStay={() => {
                const b = liveCard.activeBooking;
                if (b) actions.handleExtendStay(b.id);
              }}
              onPayment={() => {
                setPaymentAmount(String(defaultPaymentAmount));
                setShowPaymentModal(true);
              }}
              onAssignCleaning={() => actions.handleAssignCleaning(liveCard.id)}
              onMarkClean={() => actions.handleMarkClean(liveCard.id)}
              onMarkCleaning={() => actions.handleMarkCleaning(liveCard.id)}
              onBlockRoom={() => actions.handleBlockRoom(liveCard.id)}
              onSendWA={() => {
                if (booking?.guest?.phone) {
                  actions.handleSendWA(
                    booking.guest.phone,
                    `Halo ${booking.guest.name}, terkait kamar ${liveCard.number}.`
                  );
                }
              }}
              onSendReminder={() => {
                if (booking?.guest?.phone && cardBooking) {
                  actions.handleSendReminder(
                    booking.guest.phone,
                    booking.guest.name,
                    liveCard.number,
                    cardBooking.balanceDue
                  );
                }
              }}
              onMarkMaintenanceDone={() =>
                actions.handleMarkMaintenanceDone(liveCard.id)
              }
              onCancelBooking={() => {
                const b = liveCard.upcomingBooking ?? liveCard.activeBooking;
                if (b) actions.handleCancelBooking(b.id);
              }}
              onNewBooking={() => actions.goToNewBooking(liveCard.id)}
              onViewBooking={() => booking && actions.goToPos(booking.id)}
              onPos={() => booking && actions.goToPos(booking.id)}
            />
          </div>
        </SheetBody>
      </Sheet>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Terima Pembayaran"
        size="sm"
        data-testid="room-payment-modal"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Kamar <strong>{liveCard.number}</strong>
            {booking?.guest && ` · ${booking.guest.name}`}
          </p>
          <Input
            label="Nominal (Rp)"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder={String(defaultPaymentAmount)}
          />
          <Button
            className="w-full min-h-[48px] rounded-xl"
            loading={actions.loadingAction === 'payment'}
            onClick={handlePaymentSubmit}
            data-testid="room-payment-submit"
          >
            Konfirmasi Pembayaran
          </Button>
        </div>
      </Modal>
    </>
  );
}
