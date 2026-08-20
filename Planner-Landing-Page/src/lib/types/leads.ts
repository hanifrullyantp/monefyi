// Type definitions untuk CRM leads

export type LeadStatus = "new" | "contacted" | "survey" | "proposal" | "negotiation" | "won" | "lost";

export type LeadSource = "whatsapp" | "instagram" | "referral" | "website" | "tiktok" | "other";

export type ProjectType = "renovasi" | "interior" | "kitchen-set" | "furniture" | "konstruksi" | "other";

export interface LeadActivity {
  id: string;
  type: "note" | "call" | "message" | "status-change" | "proposal";
  content: string;
  timestamp: string;
  user: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  projectType: ProjectType;
  estimatedValue: number;
  status: LeadStatus;
  source: LeadSource;
  location?: string;
  notes?: string;
  surveyDate?: string;
  assignedTo?: string;
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export const LeadStatusLabels: Record<LeadStatus, string> = {
  new: "Lead Baru",
  contacted: "Dihubungi",
  survey: "Survei",
  proposal: "Penawaran",
  negotiation: "Negosiasi",
  won: "Deal",
  lost: "Tidak Deal",
};

export const LeadStatusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  survey: "bg-amber-100 text-amber-700",
  proposal: "bg-orange-100 text-orange-700",
  negotiation: "bg-indigo-100 text-indigo-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

export const ProjectTypeLabels: Record<ProjectType, string> = {
  renovasi: "Renovasi",
  interior: "Interior Design",
  "kitchen-set": "Kitchen Set",
  furniture: "Custom Furniture",
  konstruksi: "Konstruksi",
  other: "Lainnya",
};

export const LeadSourceLabels: Record<LeadSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  referral: "Referral",
  website: "Website",
  tiktok: "TikTok",
  other: "Lainnya",
};
