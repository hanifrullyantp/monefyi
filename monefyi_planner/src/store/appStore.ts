import { create } from 'zustand';

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'worker';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  tenant_id: string;
  position?: string;
  department?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  business_type: string;
  plan: 'free' | 'pro' | 'enterprise';
  currency: string;
  timezone: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  client_name: string;
  client_contact?: string;
  location?: string;
  type: 'construction' | 'it' | 'event' | 'manufacturing' | 'service' | 'other';
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  total_budget_planned: number;
  currency: string;
  manager_id?: string;
  progress_percentage: number;
  health_status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  planned_progress: number;
  spent_amount: number;
  created_at: string;
  updated_at: string;
  description?: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  due_date?: string;
  assigned_to?: string;
  assigned_by?: string;
  project_id?: string;
  tags?: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'alert' | 'recommendation' | 'update' | 'hr' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  account: string;
  date: string;
  project_id?: string;
  created_at: string;
}

export interface CommandLog {
  id: string;
  input: string;
  intent?: string;
  success: boolean;
  timestamp: string;
}

interface AppState {
  // Auth
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  
  // App State
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  isOnline: boolean;
  lastSynced: Date | null;
  
  // UI State
  activeTab: string;
  sidebarOpen: boolean;
  commandModalOpen: boolean;
  currentView: string;
  selectedProjectId: string | null;
  
  // Data
  projects: Project[];
  todos: Todo[];
  notifications: Notification[];
  transactions: Transaction[];
  commandLogs: CommandLog[];
  
  // Notifications
  unreadCount: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setAuthenticated: (val: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingSyncCount: (count: number) => void;
  setOnline: (val: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (val: boolean) => void;
  setCommandModalOpen: (val: boolean) => void;
  setCurrentView: (view: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, data: Partial<Todo>) => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Notification) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  addCommandLog: (log: CommandLog) => void;
  logout: () => void;
}

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'Rumah Pak Ahmad — Type 45',
    code: 'PRJ-001',
    client_name: 'Pak Ahmad Susanto',
    client_contact: '08123456789',
    location: 'Jl. Merdeka No. 12, Bandung',
    type: 'construction',
    status: 'active',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    total_budget_planned: 450000000,
    currency: 'IDR',
    progress_percentage: 67,
    planned_progress: 72,
    health_status: 'at_risk',
    spent_amount: 280000000,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-06-15T10:30:00Z',
    description: 'Pembangunan rumah type 45 dengan 2 kamar tidur, 1 kamar mandi, dan garasi.',
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    name: 'Gudang Logistik PT Maju',
    code: 'PRJ-002',
    client_name: 'PT Maju Bersama',
    location: 'Kawasan Industri Cikarang',
    type: 'construction',
    status: 'active',
    start_date: '2025-02-15',
    end_date: '2025-08-31',
    total_budget_planned: 1200000000,
    currency: 'IDR',
    progress_percentage: 45,
    planned_progress: 42,
    health_status: 'on_track',
    spent_amount: 480000000,
    created_at: '2025-02-15T00:00:00Z',
    updated_at: '2025-06-15T09:00:00Z',
    description: 'Pembangunan gudang logistik seluas 2000 m² dengan fasilitas loading dock.',
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    name: 'Renovasi Kantor CV Sentosa',
    code: 'PRJ-003',
    client_name: 'CV Sentosa Jaya',
    location: 'Jl. Sudirman No. 88, Jakarta',
    type: 'construction',
    status: 'active',
    start_date: '2025-05-01',
    end_date: '2025-07-31',
    total_budget_planned: 280000000,
    currency: 'IDR',
    progress_percentage: 28,
    planned_progress: 30,
    health_status: 'on_track',
    spent_amount: 75000000,
    created_at: '2025-05-01T00:00:00Z',
    updated_at: '2025-06-15T11:00:00Z',
  },
  {
    id: '4',
    tenant_id: 'tenant-1',
    name: 'Toko Modern Pak Budi',
    code: 'PRJ-004',
    client_name: 'Budi Santoso',
    location: 'Jl. Pahlawan No. 5, Surabaya',
    type: 'construction',
    status: 'on_hold',
    start_date: '2025-03-01',
    end_date: '2025-05-31',
    total_budget_planned: 180000000,
    currency: 'IDR',
    progress_percentage: 15,
    planned_progress: 85,
    health_status: 'behind',
    spent_amount: 90000000,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-05-01T08:00:00Z',
  },
];

const mockTodos: Todo[] = [
  {
    id: '1',
    title: 'Review RAP Gudang Logistik',
    description: 'Periksa ulang anggaran material untuk fase pondasi',
    priority: 'urgent',
    status: 'pending',
    due_date: '2025-06-20',
    project_id: '2',
    created_at: '2025-06-15T08:00:00Z',
  },
  {
    id: '2',
    title: 'Input realisasi biaya minggu ini',
    priority: 'high',
    status: 'in_progress',
    due_date: '2025-06-16',
    project_id: '1',
    created_at: '2025-06-14T10:00:00Z',
  },
  {
    id: '3',
    title: 'Meeting koordinasi dengan client Pak Ahmad',
    priority: 'high',
    status: 'pending',
    due_date: '2025-06-18',
    project_id: '1',
    created_at: '2025-06-13T14:00:00Z',
  },
  {
    id: '4',
    title: 'Kirim laporan progress bulanan',
    priority: 'medium',
    status: 'pending',
    due_date: '2025-06-30',
    created_at: '2025-06-01T08:00:00Z',
  },
  {
    id: '5',
    title: 'Cek stok material site Cikarang',
    priority: 'medium',
    status: 'done',
    due_date: '2025-06-15',
    project_id: '2',
    created_at: '2025-06-14T07:00:00Z',
  },
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: '⚠️ Budget Kritis — Rumah Pak Ahmad',
    message: 'Budget semen sudah 87% terpakai. Segera evaluasi penggunaan.',
    read: false,
    priority: 'critical',
    created_at: '2025-06-15T10:00:00Z',
    action_url: '/projects/1',
  },
  {
    id: '2',
    type: 'recommendation',
    title: '💡 Rekomendasi: Tambah Pekerja',
    message: 'Project Rumah Pak Ahmad behind 5%. Pertimbangkan tambah 2 pekerja untuk catch up.',
    read: false,
    priority: 'high',
    created_at: '2025-06-15T09:30:00Z',
  },
  {
    id: '3',
    type: 'update',
    title: '📊 Progress Update',
    message: 'Budi update progress Pondasi lantai 1 → 75%',
    read: false,
    priority: 'medium',
    created_at: '2025-06-15T08:45:00Z',
  },
  {
    id: '4',
    type: 'hr',
    title: '💰 Persetujuan Bon Dibutuhkan',
    message: 'Rudi mengajukan bon Rp 500.000. Tap untuk review.',
    read: true,
    priority: 'medium',
    created_at: '2025-06-14T16:00:00Z',
  },
  {
    id: '5',
    type: 'system',
    title: '✅ Sync Selesai',
    message: '12 item berhasil disinkronkan ke server.',
    read: true,
    priority: 'low',
    created_at: '2025-06-14T12:00:00Z',
  },
];

const mockTransactions: Transaction[] = [
  { id: '1', type: 'income', amount: 150000000, description: 'Termin 2 - Rumah Pak Ahmad', category: 'Project Payment', account: 'BCA Utama', date: '2025-06-10', project_id: '1', created_at: '2025-06-10T10:00:00Z' },
  { id: '2', type: 'expense', amount: 45000000, description: 'Pembelian material besi beton', category: 'Material', account: 'BCA Utama', date: '2025-06-12', project_id: '2', created_at: '2025-06-12T09:00:00Z' },
  { id: '3', type: 'income', amount: 80000000, description: 'DP Renovasi Kantor CV Sentosa', category: 'Project Payment', account: 'Mandiri Bisnis', date: '2025-06-08', project_id: '3', created_at: '2025-06-08T14:00:00Z' },
  { id: '4', type: 'expense', amount: 12000000, description: 'Gaji karyawan kantor', category: 'Gaji', account: 'BCA Utama', date: '2025-06-05', created_at: '2025-06-05T08:00:00Z' },
  { id: '5', type: 'expense', amount: 3500000, description: 'Sewa generator site Cikarang', category: 'Alat', account: 'Kas Kecil', date: '2025-06-13', project_id: '2', created_at: '2025-06-13T11:00:00Z' },
];

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  tenant: null,
  isAuthenticated: false,
  
  // App State
  syncStatus: 'synced',
  pendingSyncCount: 0,
  isOnline: true,
  lastSynced: new Date(),
  
  // UI State
  activeTab: 'home',
  sidebarOpen: false,
  commandModalOpen: false,
  currentView: 'landing',
  selectedProjectId: null,
  
  // Data
  projects: mockProjects,
  todos: mockTodos,
  notifications: mockNotifications,
  transactions: mockTransactions,
  commandLogs: [],
  
  // Computed
  unreadCount: mockNotifications.filter(n => !n.read).length,
  
  // Actions
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  setOnline: (isOnline) => set({ isOnline }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandModalOpen: (commandModalOpen) => set({ commandModalOpen }),
  setCurrentView: (currentView) => set({ currentView }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set(state => ({ projects: [project, ...state.projects] })),
  updateProject: (id, data) => set(state => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...data } : p)
  })),
  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set(state => ({ todos: [todo, ...state.todos] })),
  updateTodo: (id, data) => set(state => ({
    todos: state.todos.map(t => t.id === id ? { ...t, ...data } : t)
  })),
  setNotifications: (notifications) => set({ notifications, unreadCount: notifications.filter(n => !n.read).length }),
  markNotificationRead: (id) => set(state => {
    const notifications = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    return { notifications, unreadCount: notifications.filter(n => !n.read).length };
  }),
  markAllNotificationsRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  addNotification: (notification) => set(state => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.read ? 0 : 1),
  })),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set(state => ({ transactions: [transaction, ...state.transactions] })),
  addCommandLog: (log) => set(state => ({ commandLogs: [log, ...state.commandLogs].slice(0, 50) })),
  logout: () => set({
    user: null,
    tenant: null,
    isAuthenticated: false,
    currentView: 'landing',
    activeTab: 'home',
  }),
}));
