import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { LoginPage } from './components/AuthPages';
import ProtectedRoute from './components/ProtectedRoute';
import AuthOnlyRoute from './components/AuthOnlyRoute';
import AppShell, { AuthRedirect } from './components/AppShell';
import { PrivacyPage, TermsPage, ContactPage } from './pages/LegalPages';
import { SignupHubPage } from './pages/auth/SignupHub';
import { OwnerSignupPage } from './pages/auth/OwnerSignup';
import { VerifyEmailPage } from './pages/auth/VerifyEmail';
import { JoinByTokenPage } from './pages/join/JoinByToken';
import { JoinByCodePage } from './pages/join/JoinByCode';
import { FindCompanyPage } from './pages/join/FindCompany';
import { OwnerOnboardingWizard } from './pages/onboarding/OwnerWizard';
import { MemberOnboardingWizard } from './pages/onboarding/MemberWizard';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><AuthRedirect /><LandingPage /></>} />
        <Route path="/login" element={<><AuthRedirect /><LoginPage /></>} />
        <Route path="/signup" element={<><AuthRedirect /><SignupHubPage /></>} />
        <Route path="/signup/owner" element={<><AuthRedirect /><OwnerSignupPage /></>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/join" element={<JoinByTokenPage />} />
        <Route path="/join-by-code" element={<JoinByCodePage />} />
        <Route path="/find-company" element={<FindCompanyPage />} />
        <Route path="/onboarding/owner" element={<AuthOnlyRoute><OwnerOnboardingWizard /></AuthOnlyRoute>} />
        <Route path="/onboarding/member" element={<AuthOnlyRoute><MemberOnboardingWizard /></AuthOnlyRoute>} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/app/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
