import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FrontDeskPage from './pages/FrontDeskPage';
import RoomsPage from './pages/RoomsPage';
import BookingsPage from './pages/BookingsPage';
import GuestsPage from './pages/GuestsPage';
import PaymentsPage from './pages/PaymentsPage';
import HousekeepingPage from './pages/HousekeepingPage';
import POSPage from './pages/POSPage';
import FinancePage from './pages/FinancePage';
import GuestSurveyPage from './pages/GuestSurveyPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import PricingPage from './pages/PricingPage';
import AccountingPage from './pages/AccountingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route path="/survey/:bookingId" element={<GuestSurveyPage />} />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/front-desk" replace />} />
        <Route path="front-desk" element={<FrontDeskPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route
          path="finance"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <FinancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <EmployeeManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pricing"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <PricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="accounting"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <AccountingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute requiredRoles={['owner', 'manager']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/stay">
      <AppRoutes />
    </BrowserRouter>
  );
}
