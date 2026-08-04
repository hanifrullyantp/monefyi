import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { generateId } from '../utils/id';
import type { RoomStatus } from '../types';

export interface PropertySetupInput {
  propertyName: string;
  description: string;
  checkInTime: string;
  checkOutTime: string;
  roomTypeName: string;
  basePrice: number;
  capacity: number;
  facilities: string[];
  rooms: { number: string; floor: number; status: RoomStatus }[];
}

export interface PropertySetupResult {
  success: boolean;
  error?: string;
}

/**
 * Simpan setup penginapan awal: tenant, tipe kamar, dan daftar kamar.
 */
export async function completePropertySetup(input: PropertySetupInput): Promise<PropertySetupResult> {
  const { tenant, user, setTenant } = useAuthStore.getState();
  const { updateTenant, addRoom, roomTypes } = useAppStore.getState();

  if (!tenant || !user) {
    return { success: false, error: 'Sesi tidak valid' };
  }

  try {
    updateTenant({
      name: input.propertyName,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
    });

    const roomTypeId = generateId('rt');
    const newRoomType = {
      id: roomTypeId,
      tenantId: tenant.id,
      name: input.roomTypeName,
      description: input.description,
      basePrice: input.basePrice,
      capacity: input.capacity,
      bedType: 'Queen',
      size: 20,
      facilities: input.facilities,
      photos: [],
      isActive: true,
    };

    if (isSupabaseConfigured && supabase) {
      const { error: tenantErr } = await supabase
        .from('stay_tenants')
        .update({
          name: input.propertyName,
          description: input.description,
          check_in_time: input.checkInTime,
          check_out_time: input.checkOutTime,
          setup_completed: true,
        })
        .eq('id', tenant.id);
      if (tenantErr) throw tenantErr;

      const { data: rtRow, error: rtErr } = await supabase
        .from('stay_room_types')
        .insert({
          tenant_id: tenant.id,
          name: input.roomTypeName,
          description: input.description,
          base_price: input.basePrice,
          capacity: input.capacity,
          bed_type: 'Queen',
          size: 20,
          facilities: input.facilities,
          photos: [],
          is_active: true,
        })
        .select('id')
        .single();
      if (rtErr || !rtRow) throw rtErr ?? new Error('Gagal membuat tipe kamar');

      const dbRoomTypeId = rtRow.id as string;

      for (const room of input.rooms) {
        const { error: roomErr } = await supabase.from('stay_rooms').insert({
          tenant_id: tenant.id,
          room_type_id: dbRoomTypeId,
          number: room.number,
          floor: room.floor,
          status: room.status,
          is_active: true,
        });
        if (roomErr) throw roomErr;
      }

      await supabase
        .from('stay_users')
        .update({ onboarding_completed: true, onboarding_status: 'completed' })
        .eq('id', user.id);

      const { hydrateAppStoreFromRemote } = await import('./api/stayApi');
      await hydrateAppStoreFromRemote(tenant.id);
    } else {
      useAppStore.setState({
        roomTypes: [...roomTypes, newRoomType],
      });

      for (const room of input.rooms) {
        addRoom({
          tenantId: tenant.id,
          roomTypeId,
          number: room.number,
          floor: room.floor,
          status: room.status,
          isActive: true,
        });
      }
    }

    setTenant({ ...tenant, name: input.propertyName, setupCompleted: true });
    useAuthStore.getState().setUser({
      ...user,
      onboardingCompleted: true,
      onboardingStatus: 'completed',
    });

    return { success: true };
  } catch (err) {
    console.error('completePropertySetup:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan setup',
    };
  }
}
