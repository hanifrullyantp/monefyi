import { StrictMode, Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class BootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[STAY render error]", error, info);
  }

  render() {
    if (this.state.error) {
      const { error } = this.state;
      return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 640, margin: "40px auto" }}>
          <h1 style={{ color: "#dc2626", fontSize: 20, margin: "0 0 12px" }}>Gagal render STAY</h1>
          <p style={{ color: "#475569", margin: "0 0 16px" }}>{error.message}</p>
          <pre
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 16,
              overflow: "auto",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {error.stack}
          </pre>
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: "12px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Reset data lokal & muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Elemen #root tidak ditemukan");
}

createRoot(rootEl).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>
);
