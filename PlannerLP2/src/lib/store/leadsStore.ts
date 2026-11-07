"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lead, LeadStatus } from "@/lib/types/leads";

export const generateUniqueId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Sanitasi dan pastikan semua lead memiliki ID unik,
 * serta TIDAK PERNAH menjadikan nama lead sebagai ID (mencegah bug seleksi checklist pada nama yang identik).
 */
export const sanitizeAndEnsureUniqueLeads = (leadsList: Lead[]): Lead[] => {
  if (!Array.isArray(leadsList)) return [];
  const seenIds = new Set<string>();
  return leadsList.map((lead) => {
    const leadName = (lead.name || "").trim().toLowerCase();
    const currentId = (lead.id || "").trim();

    // Jika ID kosong, sudah pernah dipakai oleh lead lain, atau sama persis dengan nama lead:
    // Buat UUID baru yang pasti unik!
    const isInvalidOrDuplicate =
      !currentId ||
      seenIds.has(currentId) ||
      (leadName.length > 0 && currentId.toLowerCase() === leadName);

    const finalId = isInvalidOrDuplicate ? generateUniqueId() : currentId;
    seenIds.add(finalId);

    return {
      ...lead,
      id: finalId,
    };
  });
};

interface LeadsStore {
  leads: Lead[];
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "activities"> & { id?: string; createdAt?: string; updatedAt?: string; activities?: Lead["activities"] }) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  deleteLeads: (ids: string[]) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addActivity: (leadId: string, activity: Omit<Lead["activities"][0], "id">) => void;
  getLead: (id: string) => Lead | undefined;
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  cleanDuplicateIds: () => void;
}

export const useLeadsStore = create<LeadsStore>()(
  persist(
    (set, get) => ({
      leads: [],

      addLead: (leadData) => {
        // Validasi ID: Jangan pernah gunakan nama sebagai ID!
        let id = (leadData as any).id;
        const leadName = (leadData.name || "").trim().toLowerCase();
        if (!id || (leadName && String(id).trim().toLowerCase() === leadName)) {
          id = generateUniqueId();
        }

        const existingIndex = get().leads.findIndex((l) => l.id === id);
        if (existingIndex !== -1) {
          get().updateLead(id, leadData);
          return;
        }

        const newLead: Lead = {
          ...leadData,
          id,
          amount: (leadData as any).amount ?? (leadData as any).estimatedValue,
          estimatedValue: (leadData as any).estimatedValue ?? (leadData as any).amount,
          activities: (leadData as any).activities || [],
          createdAt: (leadData as any).createdAt || new Date().toISOString(),
          updatedAt: (leadData as any).updatedAt || new Date().toISOString(),
        };
        set((state) => ({ leads: [newLead, ...state.leads] }));
      },

      cleanDuplicateIds: () => {
        set((state) => ({ leads: sanitizeAndEnsureUniqueLeads(state.leads) }));
      },

      updateLead: (id, updates) => {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id
              ? {
                  ...lead,
                  ...updates,
                  amount: (updates as any).amount ?? lead.amount ?? (updates as any).estimatedValue,
                  estimatedValue: (updates as any).estimatedValue ?? (updates as any).amount ?? lead.estimatedValue,
                  updatedAt: new Date().toISOString(),
                }
              : lead,
          ),
        }));
      },

      deleteLead: (id) => {
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
        }));
      },

      deleteLeads: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          leads: state.leads.filter((lead) => !idSet.has(lead.id)),
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
                      id: generateUniqueId(),
                      type: "status_change" as const,
                      content: `Status berubah ke ${status}`,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : l,
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
                    { ...activity, id: generateUniqueId() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : lead,
          ),
        }));
      },

      getLead: (id) => get().leads.find((lead) => lead.id === id),

      getLeadsByStatus: (status) => get().leads.filter((lead) => lead.status === status),
    }),
    {
      name: "monefyi-leads",
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.leads)) {
          state.leads = sanitizeAndEnsureUniqueLeads(state.leads);
        }
      },
    },
  ),
);
