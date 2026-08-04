import {
  BedDouble,
  Droplets,
  Thermometer,
  Tv,
  Wifi,
  Wind,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import type { RoomCardData } from '../../../types/frontdesk.types';

const FACILITY_ICONS: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  AC: Wind,
  TV: Tv,
  'Air Panas': Thermometer,
  'Kamar Mandi Dalam': Droplets,
};

export interface RoomFacilitiesProps {
  room: RoomCardData;
  capacity: number;
}

export default function RoomFacilities({ room, capacity }: RoomFacilitiesProps) {
  return (
    <section className="space-y-4" aria-labelledby="facilities-heading">
      <h3 id="facilities-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Info Kamar
      </h3>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <BedDouble className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{room.roomTypeName}</p>
          <p className="text-xs text-gray-500">Kapasitas maks. {capacity} tamu</p>
        </div>
      </div>

      {room.facilities.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {room.facilities.map((f) => {
            const Icon = FACILITY_ICONS[f] ?? BedDouble;
            return (
              <div
                key={f}
                className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"
              >
                <Icon className="h-5 w-5 text-gray-500" />
                <span className="text-[10px] font-bold text-gray-600">{f}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Harga:{' '}
        <span className="font-bold text-gray-900">
          {formatCurrency(room.basePrice)}/malam
        </span>
      </p>
    </section>
  );
}
