import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { LandingCmsProvider } from "./context/LandingCmsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AdminAuthProvider>
        <LandingCmsProvider>
          <App />
        </LandingCmsProvider>
      </AdminAuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
