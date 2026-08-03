import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const bookingGuestSchema = z.object({
  guestName: z.string().min(2, 'Nama minimal 2 karakter'),
  guestPhone: z.string().min(10, 'Nomor HP minimal 10 digit'),
  guestIdNumber: z.string().optional(),
  roomId: z.string().min(1, 'Pilih kamar'),
  checkIn: z.string().min(1, 'Tanggal check-in wajib'),
  checkOut: z.string().min(1, 'Tanggal check-out wajib'),
});

export const guestSurveySchema = z.object({
  idNumber: z.string().length(16, 'NIK harus 16 digit'),
  address: z.string().min(5, 'Alamat wajib diisi'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib'),
});

export const roomSchema = z.object({
  number: z.string().min(1, 'Nomor kamar wajib'),
  floor: z.coerce.number().min(0),
  roomTypeId: z.string().min(1),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type BookingGuestFormData = z.infer<typeof bookingGuestSchema>;
export type GuestSurveyFormData = z.infer<typeof guestSurveySchema>;
