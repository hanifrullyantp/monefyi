// Tipe data untuk CRM & leads

export type LeadStatus =
  | "new"
  | "contacted"
  | "survey_scheduled"
  | "survey_done"
  | "proposal_sent"
  | "negotiating"
  | "won"
  | "lost"
  | "abandoned_checkout"
  | "pending_payment";

export type LeadSource =
  | "checkout"
  | "whatsapp"
  | "instagram"
  | "referral"
  | "website"
  | "facebook"
  | "tiktok"
  | "other";

export interface LeadActivity {
  id: string;
  type: "note" | "call" | "whatsapp" | "email" | "meeting" | "status_change";
  content: string;
  timestamp: string;
  by?: string;
}

export interface LeadEmailLog {
  id: string;
  resendId?: string;
  type: "payment_confirmation" | "account_access" | "password_reset" | "followup";
  subject: string;
  to: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  sentAt: string;
  error?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  source: LeadSource;
  status: LeadStatus;
  projectType: string;
  estimatedValue?: number;
  notes?: string;
  surveyDate?: string;
  surveyTime?: string;
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  tags?: string[];
  // Conversational Checkout metadata
  sessionId?: string;
  checkoutStep?: number;
  planTier?: "free" | "standard" | "pro";
  bumpTaken?: boolean;
  paymentMethod?: string;
  amount?: number;
  paymentId?: string;
  // Resend Email Logs
  emails?: LeadEmailLog[];
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Lead Baru",
  contacted: "Sudah Dihubungi",
  survey_scheduled: "Survei Dijadwalkan",
  survey_done: "Survei Selesai",
  proposal_sent: "Penawaran Terkirim",
  negotiating: "Negosiasi",
  won: "Deal / Paid",
  lost: "Tidak Jadi",
  abandoned_checkout: "Checkout Tertunda",
  pending_payment: "Menunggu Pembayaran",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  survey_scheduled: "bg-amber-100 text-amber-700",
  survey_done: "bg-orange-100 text-orange-700",
  proposal_sent: "bg-indigo-100 text-indigo-700",
  negotiating: "bg-yellow-100 text-yellow-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  abandoned_checkout: "bg-rose-100 text-rose-700",
  pending_payment: "bg-amber-100 text-amber-800",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  checkout: "Checkout Form",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  referral: "Referral",
  website: "Website",
  facebook: "Facebook",
  tiktok: "TikTok",
  other: "Lainnya",
};
