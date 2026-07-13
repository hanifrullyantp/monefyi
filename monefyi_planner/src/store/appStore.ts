import { create } from 'zustand';
import { signOut as authSignOut } from '../services/authService';
import { loadNotifications } from '../services/notificationService';
import { loadProjects } from '../services/projectService';
import type { FinanceVersion } from '../types/financeV2';
import type { MigrationFlags } from '../types/rpp';
import { DEFAULT_MIGRATION_FLAGS } from '../types/rpp';

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
  brandColor?: string;
  business_type: string;
  plan: 'free' | 'starter' | 'pro' | 'pro_plus' | 'enterprise';
  currency: string;
  timezone: string;
  workHours?: { start: { hour: number; minute: number }; end: { hour: number; minute: number } };
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  client_name: string;
  client_contact?: string;
  location?: string;
  type: string;
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  total_budget_planned: number;
  /** Nilai kontrak dengan klien (disimpan di settings.contract_value). */
  contract_value?: number;
  currency: string;
  manager_id?: string;
  progress_percentage: number;
  health_status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  planned_progress: number;
  spent_amount: number;
  total_received: number;
  created_at: string;
  updated_at: string;
  description?: string;
  finance_status?: 'active' | 'finance_closed';
  closed_at?: string;
  final_profit?: number;
  finance_report_month?: string;
  finance_report_month_manual?: boolean;
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
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  authInitializing: boolean;
  authError: string | null;
  projectsListFilter: string;
  hasMembership: boolean;
  signupIntent: string | null;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  platformRole: 'user' | 'admin';
  uiViewMode: 'auto' | 'owner' | 'worker';

  syncStatus: SyncStatus;
  pendingSyncCount: number;
  isOnline: boolean;
  lastSynced: Date | null;

  activeTab: string;
  financeVersion: FinanceVersion;
  migrationFlags: MigrationFlags;
  customDomainContext: import('../services/customDomainService').ResolvedDomainContext | null;
  sidebarOpen: boolean;
  /** Desktop nav sidebar disembunyikan untuk layar lebih lebar (estimator, dll). */
  navSidebarCollapsed: boolean;
  /** Panel kanan (aksi cepat) disembunyikan oleh user. */
  rightPanelHidden: boolean;
  commandModalOpen: boolean;
  selectedProjectId: string | null;

  projects: Project[];
  todos: Todo[];
  notifications: Notification[];
  transactions: Transaction[];
  commandLogs: CommandLog[];
  unreadCount: number;

  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setAuthenticated: (val: boolean) => void;
  setDemoMode: (val: boolean) => void;
  setProjectsListFilter: (filter: string) => void;
  setAuthInitializing: (val: boolean) => void;
  setAuthError: (error: string | null) => void;
  setHasMembership: (val: boolean) => void;
  setSignupIntent: (intent: string | null) => void;
  setOnboardingCompleted: (val: boolean) => void;
  setEmailVerified: (val: boolean) => void;
  setPlatformRole: (role: 'user' | 'admin') => void;
  setUiViewMode: (mode: 'auto' | 'owner' | 'worker') => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingSyncCount: (count: number) => void;
  setOnline: (val: boolean) => void;
  setLastSynced: (date: Date | null) => void;
  setActiveTab: (tab: string) => void;
  setFinanceVersionPreference: (version: FinanceVersion) => void;
  setMigrationFlags: (flags: MigrationFlags) => void;
  setCustomDomainContext: (ctx: import('../services/customDomainService').ResolvedDomainContext | null) => void;
  setSidebarOpen: (val: boolean) => void;
  setNavSidebarCollapsed: (val: boolean) => void;
  toggleNavSidebarCollapsed: () => void;
  setRightPanelHidden: (val: boolean) => void;
  toggleRightPanelHidden: () => void;
  setCommandModalOpen: (val: boolean) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
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
  setCommandLogs: (logs: CommandLog[]) => void;
  addCommandLog: (log: CommandLog) => void;
  refreshData: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isDemoMode: false,
  authInitializing: true,
  authError: null,
  projectsListFilter: 'all',
  hasMembership: false,
  signupIntent: null,
  onboardingCompleted: false,
  emailVerified: false,
  platformRole: 'user',
  uiViewMode: (typeof sessionStorage !== 'undefined'
    ? (sessionStorage.getItem('monefyi_ui_view_mode') as 'auto' | 'owner' | 'worker') || 'auto'
    : 'auto'),

  syncStatus: 'synced',
  pendingSyncCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSynced: null,

  activeTab: 'home',
  financeVersion: 'v2',
  migrationFlags: { ...DEFAULT_MIGRATION_FLAGS },
  customDomainContext: null,
  sidebarOpen: false,
  navSidebarCollapsed: typeof localStorage !== 'undefined'
    && localStorage.getItem('monefyi_nav_sidebar_collapsed') === '1',
  rightPanelHidden: typeof localStorage !== 'undefined'
    && localStorage.getItem('monefyi_right_panel_hidden') === '1',
  commandModalOpen: false,
  selectedProjectId: null,

  projects: [],
  todos: [],
  notifications: [],
  transactions: [],
  commandLogs: [],
  unreadCount: 0,

  setUser: user => set({ user }),
  setTenant: tenant => set({ tenant }),
  setAuthenticated: isAuthenticated => set({ isAuthenticated }),
  setDemoMode: isDemoMode => set({ isDemoMode }),
  setProjectsListFilter: projectsListFilter => set({ projectsListFilter }),
  setAuthInitializing: authInitializing => set({ authInitializing }),
  setAuthError: authError => set({ authError }),
  setHasMembership: hasMembership => set({ hasMembership }),
  setSignupIntent: signupIntent => set({ signupIntent }),
  setOnboardingCompleted: onboardingCompleted => set({ onboardingCompleted }),
  setEmailVerified: emailVerified => set({ emailVerified }),
  setPlatformRole: platformRole => set({ platformRole }),
  setUiViewMode: uiViewMode => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('monefyi_ui_view_mode', uiViewMode);
    }
    set({ uiViewMode });
  },
  setSyncStatus: syncStatus => set({ syncStatus }),
  setPendingSyncCount: pendingSyncCount => set({ pendingSyncCount }),
  setOnline: isOnline => set({ isOnline }),
  setLastSynced: lastSynced => set({ lastSynced }),
  setActiveTab: activeTab => set({ activeTab }),
  setFinanceVersionPreference: financeVersion => set({ financeVersion }),
  setMigrationFlags: migrationFlags => set({ migrationFlags }),
  setCustomDomainContext: customDomainContext => set({ customDomainContext }),
  setSidebarOpen: sidebarOpen => set({ sidebarOpen }),
  setNavSidebarCollapsed: navSidebarCollapsed => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monefyi_nav_sidebar_collapsed', navSidebarCollapsed ? '1' : '0');
    }
    set({ navSidebarCollapsed });
  },
  toggleNavSidebarCollapsed: () => {
    const next = !get().navSidebarCollapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monefyi_nav_sidebar_collapsed', next ? '1' : '0');
    }
    set({ navSidebarCollapsed: next });
  },
  setRightPanelHidden: rightPanelHidden => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monefyi_right_panel_hidden', rightPanelHidden ? '1' : '0');
    }
    set({ rightPanelHidden });
  },
  toggleRightPanelHidden: () => {
    const next = !get().rightPanelHidden;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monefyi_right_panel_hidden', next ? '1' : '0');
    }
    set({ rightPanelHidden: next });
  },
  setCommandModalOpen: commandModalOpen => set({ commandModalOpen }),
  setSelectedProjectId: selectedProjectId => set({ selectedProjectId }),
  setProjects: projects => set({ projects }),
  addProject: project => set(state => ({ projects: [project, ...state.projects] })),
  removeProject: id =>
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    })),
  updateProject: (id, data) =>
    set(state => ({
      projects: state.projects.map(p => (p.id === id ? { ...p, ...data } : p)),
    })),
  setTodos: todos => set({ todos }),
  addTodo: todo => set(state => ({ todos: [todo, ...state.todos] })),
  updateTodo: (id, data) =>
    set(state => ({
      todos: state.todos.map(t => (t.id === id ? { ...t, ...data } : t)),
    })),
  setNotifications: notifications =>
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    }),
  markNotificationRead: id =>
    set(state => {
      const notifications = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    }),
  markAllNotificationsRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  addNotification: notification =>
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  setTransactions: transactions => set({ transactions }),
  addTransaction: transaction =>
    set(state => ({ transactions: [transaction, ...state.transactions] })),
  setCommandLogs: commandLogs => set({ commandLogs }),
  addCommandLog: log =>
    set(state => ({ commandLogs: [log, ...state.commandLogs].slice(0, 50) })),

  refreshData: async () => {
    const { user, tenant } = get();
    if (!user || !tenant) return;
    set({ syncStatus: 'syncing' });
    try {
      const [projects, notifications] = await Promise.all([
        loadProjects(tenant.id, tenant.currency),
        loadNotifications(user.id),
      ]);
      set({
        projects,
        notifications,
        lastSynced: new Date(),
        syncStatus: 'synced',
      });
    } catch (e) {
      console.error('refreshData:', e);
      set({ syncStatus: 'error' });
    }
  },

  logout: async () => {
    const { isDemoMode } = get();
    if (!isDemoMode) {
      try {
        sessionStorage.setItem('monefyi_manual_logout', '1');
      } catch { /* ignore */ }
      await authSignOut();
    }
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isDemoMode: false,
      projects: [],
      notifications: [],
      todos: [],
      transactions: [],
      commandLogs: [],
      unreadCount: 0,
      activeTab: 'home',
      selectedProjectId: null,
      authError: null,
      hasMembership: false,
      signupIntent: null,
      onboardingCompleted: false,
      emailVerified: false,
    });
  },
}));
