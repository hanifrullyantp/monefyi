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

export const useLeadsStore = create<LeadsStore>()(
  persist(
    (set, get) => ({
      leads: [],

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
              : lead,
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
                    { ...activity, id: Date.now().toString() },
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
    },
  ),
);
