import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;

export const registerSchema = z
  .object({
    fullName: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Email tidak valid'),
    phone: z
      .string()
      .min(10, 'Nomor HP minimal 10 digit')
      .refine((v) => phoneRegex.test(v.replace(/\s/g, '')), 'Format HP: +62 atau 08xx'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/\d/, 'Password harus mengandung angka'),
    confirmPassword: z.string(),
    propertyName: z.string().min(2, 'Nama penginapan wajib'),
    propertyType: z.string().min(1, 'Pilih jenis penginapan'),
    city: z.string().min(1, 'Pilih kota'),
    address: z.string().optional(),
    roomCount: z.coerce.number().min(1, 'Min 1 kamar').max(500, 'Max 500 kamar'),
    operatingStatus: z.string().min(1, 'Pilih status operasional'),
    referralSource: z.string().optional(),
    acceptTerms: z.literal(true, { message: 'Anda harus menyetujui Syarat & Ketentuan' }),
    marketingOptIn: z.boolean().optional(),
    leadSource: z.enum(['landing_page_cta', 'direct_register', 'login_link']).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const REGISTER_DRAFT_KEY = 'stay-register-draft';

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
