"use client";
import { create } from "zustand";
import type { Lead, LeadStatus } from "@/lib/types/leads";
import { getStorage, setStorage } from "@/lib/utils/storage";

const STORAGE_KEY = "monefyi_leads";

// Sample default leads
const defaultLeads: Lead[] = [
  {
    id: "1",
    name: "Bpk Andi Prasetyo",
    phone: "08112345678",
    email: "andi@email.com",
    projectType: "renovasi",
    estimatedValue: 45000000,
    status: "survey",
    source: "whatsapp",
    location: "Jakarta Selatan",
    notes: "Renovasi kamar mandi dan dapur",
    surveyDate: new Date(Date.now() + 86400000).toISOString(),
    assignedTo: "Admin",
    activities: [
      {
        id: "a1",
        type: "note",
        content: "Lead masuk dari WA blast",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        user: "Admin",
      },
      {
        id: "a2",
        type: "status-change",
        content: "Status berubah ke Survei",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        user: "Admin",
      },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Ibu Sari Dewi",
    phone: "08987654321",
    projectType: "kitchen-set",
    estimatedValue: 35000000,
    status: "proposal",
    source: "instagram",
    location: "Bandung",
    notes: "Kitchen set untuk rumah baru",
    activities: [],
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Bpk Rudi Santoso",
    phone: "08765432198",
    projectType: "interior",
    estimatedValue: 120000000,
    status: "won",
    source: "referral",
    location: "Surabaya",
    notes: "Interior design apartemen 3 kamar",
    activities: [],
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Ibu Maya Lestari",
    phone: "08234567890",
    projectType: "furniture",
    estimatedValue: 25000000,
    status: "new",
    source: "website",
    location: "Yogyakarta",
    activities: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Studio Interior Cipta",
    phone: "08345678901",
    projectType: "interior",
    estimatedValue: 200000000,
    status: "negotiation",
    source: "referral",
    location: "Jakarta Barat",
    activities: [],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface LeadsState {
  leads: Lead[];
  selectedIds: string[];
  searchQuery: string;
  statusFilter: LeadStatus | "all";
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "activities">) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  deleteLeads: (ids: string[]) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addActivity: (leadId: string, activity: Omit<Lead["activities"][0], "id" | "timestamp">) => void;
  setSelectedIds: (ids: string[]) => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (s: LeadStatus | "all") => void;
  load: () => void;
  save: () => void;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: defaultLeads,
  selectedIds: [],
  searchQuery: "",
  statusFilter: "all",

  addLead: (lead) => {
    const newLead: Lead = {
      ...lead,
      id: Date.now().toString(),
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ leads: [newLead, ...state.leads] }));
    get().save();
  },

  updateLead: (id, data) => {
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l
      ),
    }));
    get().save();
  },

  deleteLead: (id) => {
    set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
    get().save();
  },

  deleteLeads: (ids) => {
    set((state) => ({ leads: state.leads.filter((l) => !ids.includes(l.id)) }));
    get().save();
  },

  updateLeadStatus: (id, status) => {
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
                  type: "status-change" as const,
                  content: `Status berubah ke ${status}`,
                  timestamp: new Date().toISOString(),
                  user: "Admin",
                },
              ],
            }
          : l
      ),
    }));
    get().save();
  },

  addActivity: (leadId, activity) => {
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              activities: [
                ...l.activities,
                { ...activity, id: Date.now().toString(), timestamp: new Date().toISOString() },
              ],
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    }));
    get().save();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (s) => set({ statusFilter: s }),

  load: () => {
    const stored = getStorage<Lead[]>(STORAGE_KEY, defaultLeads);
    set({ leads: stored });
  },

  save: () => {
    const { leads } = get();
    setStorage(STORAGE_KEY, leads);
  },
}));
