import { create } from 'zustand';
import { trackFrontDeskEvent } from '../utils/frontDeskAnalytics';
import {
  DEFAULT_ROOM_FILTER,
  type RoomCardData,
  type RoomFilter,
  type ViewMode,
} from '../types/frontdesk.types';

function readInitialViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem('stay-frontdesk-view-mode');
    if (raw === 'grid' || raw === 'floorplan' || raw === 'timeline') return raw;
  } catch {
    /* ignore */
  }
  return 'grid';
}

interface FrontDeskState {
  selectedRoom: RoomCardData | null;
  isDetailPanelOpen: boolean;
  editingRoomId: string | null;
  activeView: ViewMode;
  filters: RoomFilter;
  searchQuery: string;
  selectRoom: (room: RoomCardData) => void;
  closeDetailPanel: () => void;
  setEditingRoomId: (roomId: string | null) => void;
  setActiveView: (view: ViewMode) => void;
  setFilters: (filters: RoomFilter) => void;
  setSearchQuery: (query: string) => void;
}

export const useFrontDeskStore = create<FrontDeskState>((set) => ({
  selectedRoom: null,
  isDetailPanelOpen: false,
  editingRoomId: null,
  activeView: readInitialViewMode(),
  filters: DEFAULT_ROOM_FILTER,
  searchQuery: '',

  selectRoom: (room) => {
    trackFrontDeskEvent('room_panel_open', { roomId: room.id, number: room.number });
    set({ selectedRoom: room, isDetailPanelOpen: true, editingRoomId: null });
  },

  closeDetailPanel: () => {
    trackFrontDeskEvent('room_panel_close');
    set({ isDetailPanelOpen: false });
  },

  setEditingRoomId: (roomId) => set({ editingRoomId: roomId }),

  setActiveView: (view) =>
    set((state) => ({
      activeView: view,
      filters: { ...state.filters, viewMode: view },
    })),

  setFilters: (filters) => set({ filters }),

  setSearchQuery: (query) =>
    set((state) => ({
      searchQuery: query,
      filters: { ...state.filters, search: query },
    })),
}));
