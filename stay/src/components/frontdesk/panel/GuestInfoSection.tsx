import { Baby, Copy, Mail, MessageCircle, UserRound } from 'lucide-react';
import GuestAvatar from '../GuestAvatar';
import { cn } from '../../../utils/cn';
import type { Booking } from '../../../types';
import type { LoyaltyTier } from '../../../utils/roomDetailHelpers';

const LOYALTY_STYLES: Record<LoyaltyTier, string> = {
  Regular: 'bg-gray-100 text-gray-700 border-gray-200',
  Silver: 'bg-slate-200 text-slate-800 border-slate-300',
  Gold: 'bg-amber-100 text-amber-800 border-amber-300',
  Platinum: 'bg-violet-100 text-violet-800 border-violet-300',
};

export interface GuestInfoSectionProps {
  booking?: Booking;
  loyaltyTier: LoyaltyTier;
}

export default function GuestInfoSection({ booking, loyaltyTier }: GuestInfoSectionProps) {
  if (!booking?.guest) return null;

  const { guest } = booking;

  const copyEmail = async () => {
    if (!guest.email) return;
    await navigator.clipboard.writeText(guest.email);
  };

  const waUrl = guest.phone
    ? `https://wa.me/${guest.phone.replace(/\D/g, '').replace(/^0/, '62')}`
    : undefined;

  return (
    <section className="space-y-4" aria-labelledby="guest-info-heading">
      <h3 id="guest-info-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Info Tamu
      </h3>

      <div className="flex items-start gap-4">
        <GuestAvatar
          name={guest.name}
          size="lg"
          className="!h-20 !w-20 !text-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-gray-900">{guest.name}</p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase',
              LOYALTY_STYLES[loyaltyTier]
            )}
          >
            {loyaltyTier}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {guest.phone && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
        {guest.email && (
          <button
            type="button"
            onClick={copyEmail}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4" />
            Copy Email
          </button>
        )}
      </div>

      {guest.email && (
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-gray-400" />
          {guest.email}
        </p>
      )}

      <div className="flex gap-4 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-4 w-4 text-gray-400" />
          {booking.adults} dewasa
        </span>
        {booking.children > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Baby className="h-4 w-4 text-gray-400" />
            {booking.children} anak
          </span>
        )}
      </div>

      {(guest.notes || booking.notes) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="text-[10px] font-black uppercase text-amber-600">Catatan Khusus</p>
          <p className="mt-1">{guest.notes ?? booking.notes}</p>
        </div>
      )}
    </section>
  );
}
