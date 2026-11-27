import { EstimatorModule } from "./EstimatorModule";

const hostPreview = {
  currentUser: { name: "Rina", email: "rina@contoh.id" },
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
