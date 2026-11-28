import { EstimatorModule } from "./EstimatorModule";

const hostPreview = {
  currentUser: { name: "Super Admin", email: import.meta.env.VITE_PREVIEW_EMAIL ?? "" },
  onNavigateBack: () => {
    window.dispatchEvent(new CustomEvent("estimator:host-back"));
  },
  onProjectCreated: (project: { name: string }) => {
    document.title = `RAB · ${project.name} — Ruang RAB`;
  },
};

export default function App() {
  return <EstimatorModule host={hostPreview} />;
}
