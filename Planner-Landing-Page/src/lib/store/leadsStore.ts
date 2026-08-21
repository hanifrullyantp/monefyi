"use client";
import { create } from "zustand";
import type { Lead, LeadStatus } from "@/lib/types/leads";
import { getStorage, setStorage } from "@/lib/utils/storage";

const STORAGE_KEY = "monefyi_leads";

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
  leads: [],
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
        l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l,
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
          : l,
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
          : l,
      ),
    }));
    get().save();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (s) => set({ statusFilter: s }),

  load: () => {
    const stored = getStorage<Lead[]>(STORAGE_KEY, []);
    set({ leads: stored });
  },

  save: () => {
    setStorage(STORAGE_KEY, get().leads);
  },
}));
