"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lead, LeadStatus } from "@/lib/types/leads";

interface LeadsStore {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "activities">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addActivity: (leadId: string, activity: Omit<Lead["activities"][0], "id">) => void;
  getLead: (id: string) => Lead | undefined;
  getLeadsByStatus: (status: LeadStatus) => Lead[];
}

const sampleLeads: Lead[] = [
  {
    id: "1",
    name: "Bpk Andi Saputra",
    phone: "08123456789",
    email: "andi@email.com",
    address: "Jl. Merdeka No. 12, Bandung",
    city: "Bandung",
    source: "whatsapp",
    status: "survey_scheduled",
    projectType: "Renovasi Kamar Mandi",
    estimatedValue: 45000000,
    notes: "Budget sekitar 40-50jt, mau pakai keramik premium",
    surveyDate: "2026-01-20",
    surveyTime: "10:00",
    activities: [
      {
        id: "a1",
        type: "whatsapp",
        content: "Lead masuk dari WA. Tertarik renovasi kamar mandi.",
        timestamp: "2026-01-15T08:00:00Z",
      },
      {
        id: "a2",
        type: "status_change",
        content: "Status berubah dari Lead Baru ke Survei Dijadwalkan",
        timestamp: "2026-01-15T09:30:00Z",
      },
    ],
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-01-15T09:30:00Z",
    tags: ["premium", "renovasi"],
  },
  {
    id: "2",
    name: "Ibu Sari Dewi",
    phone: "08234567890",
    city: "Jakarta Selatan",
    source: "instagram",
    status: "proposal_sent",
    projectType: "Kitchen Set Custom",
    estimatedValue: 75000000,
    notes: "Kitchen island + lemari dapur, material HPL premium",
    activities: [
      {
        id: "a3",
        type: "meeting",
        content: "Survei lokasi selesai. Ukuran 4x3m.",
        timestamp: "2026-01-14T14:00:00Z",
      },
      {
        id: "a4",
        type: "whatsapp",
        content: "Penawaran PDF dikirim ke WA klien",
        timestamp: "2026-01-14T16:00:00Z",
      },
    ],
    createdAt: "2026-01-12T10:00:00Z",
    updatedAt: "2026-01-14T16:00:00Z",
    tags: ["kitchen", "high-value"],
  },
  {
    id: "3",
    name: "Bpk Rudi Hartono",
    phone: "08345678901",
    city: "Surabaya",
    source: "referral",
    status: "won",
    projectType: "Interior Ruang Tamu",
    estimatedValue: 120000000,
    activities: [
      {
        id: "a5",
        type: "status_change",
        content: "DEAL! Klien setuju dengan penawaran Rp 115jt",
        timestamp: "2026-01-13T11:00:00Z",
      },
    ],
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-13T11:00:00Z",
    tags: ["interior", "deal"],
  },
  {
    id: "4",
    name: "Ibu Maya Indah",
    phone: "08456789012",
    city: "Yogyakarta",
    source: "website",
    status: "new",
    projectType: "Kanopi Carport",
    estimatedValue: 18000000,
    activities: [
      {
        id: "a6",
        type: "whatsapp",
        content: "Lead baru masuk dari website. Minta info kanopi.",
        timestamp: "2026-01-15T11:00:00Z",
      },
    ],
    createdAt: "2026-01-15T11:00:00Z",
    updatedAt: "2026-01-15T11:00:00Z",
    tags: ["kanopi"],
  },
  {
    id: "5",
    name: "Bpk Joko Susanto",
    phone: "08567890123",
    city: "Semarang",
    source: "facebook",
    status: "lost",
    projectType: "Renovasi Rumah Full",
    estimatedValue: 200000000,
    notes: "Budget tidak cocok. Klien minta harga Rp 150jt.",
    activities: [
      {
        id: "a7",
        type: "note",
        content: "Klien memilih vendor lain karena harga lebih murah.",
        timestamp: "2026-01-12T15:00:00Z",
      },
    ],
    createdAt: "2026-01-08T10:00:00Z",
    updatedAt: "2026-01-12T15:00:00Z",
    tags: ["renovasi", "budget-issue"],
  },
];

export const useLeadsStore = create<LeadsStore>()(
  persist(
    (set, get) => ({
      leads: sampleLeads,

      addLead: (leadData) => {
        const newLead: Lead = {
          ...leadData,
          id: Date.now().toString(),
          activities: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ leads: [newLead, ...state.leads] }));
      },

      updateLead: (id, updates) => {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id
              ? { ...lead, ...updates, updatedAt: new Date().toISOString() }
              : lead
          ),
        }));
      },

      deleteLead: (id) => {
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
        }));
      },

      updateLeadStatus: (id, status) => {
        const lead = get().getLead(id);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status,
                  updatedAt: new Date().toISOString(),
                  activities: [
                    ...l.activities,
                    {
                      id: Date.now().toString(),
                      type: "status_change" as const,
                      content: `Status berubah ke ${status}`,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : l
          ),
        }));
      },

      addActivity: (leadId, activity) => {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  activities: [
                    ...lead.activities,
                    { ...activity, id: Date.now().toString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : lead
          ),
        }));
      },

      getLead: (id) => {
        return get().leads.find((lead) => lead.id === id);
      },

      getLeadsByStatus: (status) => {
        return get().leads.filter((lead) => lead.status === status);
      },
    }),
    {
      name: "monefyi-leads",
    }
  )
);
