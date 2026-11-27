import type { CSSProperties } from "react";
import type { EstimatorModuleProps } from "./data/types";
import { EstimatorProvider, useEstimator } from "./ui/context";
import { ModuleShell } from "./ui/Shell";
import { HomeScreen } from "./ui/screens/Home";
import { ProjectScreen } from "./ui/screens/Project";
import { RabDetailScreen } from "./ui/screens/RabDetail";
import { PricesScreen } from "./ui/screens/Prices";
import { TransferScreen } from "./ui/screens/Transfer";
import { SettingsScreen } from "./ui/screens/Settings";
import { LessonsScreen } from "./ui/screens/Lessons";
import { BacktestScreen } from "./ui/screens/Backtest";
import { ArchiveScreen } from "./ui/screens/Archive";
import { ActualsScreen } from "./ui/screens/Actuals";
import { LayoutEditorScreen } from "./ui/screens/LayoutEditor";
import { PlannerScreen } from "./ui/screens/Planner";
import { Button, Card } from "./ui/components";
import { FolderSearch } from "lucide-react";

function Router({ host }: { host: EstimatorModuleProps }) {
  const { route, activeProject } = useEstimator();
  if (route.name === "home") return <HomeScreen host={host} />;
  if (route.name === "project") {
    if (!activeProject) return <ProjectNotFound />;
    return <ProjectScreen project={activeProject} />;
  }
  if (route.name === "rab") {
    if (!activeProject) return <ProjectNotFound />;
    return <RabDetailScreen project={activeProject} />;
  }
  if (route.name === "prices") return <PricesScreen />;
  if (route.name === "transfer") return <TransferScreen />;
  if (route.name === "settings") return <SettingsScreen />;
  if (route.name === "lessons") return <LessonsScreen />;
  if (route.name === "backtest") return <BacktestScreen />;
  if (route.name === "archive") return <ArchiveScreen />;
  if (route.name === "actuals") return <ActualsScreen projectId={route.projectId} />;
  if (route.name === "layout") {
    if (!activeProject) return <ProjectNotFound />;
    return <LayoutEditorScreen project={activeProject} />;
  }
  if (route.name === "planner") {
    if (!activeProject) return <ProjectNotFound />;
    return <PlannerScreen project={activeProject} />;
  }
  return <HomeScreen host={host} />;
}

function ProjectNotFound() {
  const { navigate } = useEstimator();
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f6f3] text-accent"><FolderSearch className="h-5 w-5" /></span>
        <h1 className="mt-3 text-[18px] font-extrabold text-ink">Proyek tidak ditemukan</h1>
        <p className="mt-1 text-[12px] leading-5 text-muted">Proyek mungkin sudah dihapus dari cadangan atau belum dimuat dari IndexedDB. Kembali ke daftar proyek untuk memilih yang tersedia.</p>
        <Button className="mt-4" size="sm" onClick={() => navigate({ name: "home" })}>Buka daftar proyek</Button>
      </Card>
    </div>
  );
}

export function EstimatorModule({ host }: { host: EstimatorModuleProps }) {
  const themeStyle = {
    ...(host.theme?.accent ? { "--color-accent": host.theme.accent } : {}),
    ...(host.theme?.surface ? { "--color-canvas": host.theme.surface } : {}),
  } as CSSProperties;
  return (
    <div style={themeStyle} data-module="estimator-rab">
      <EstimatorProvider host={host}>
        <ModuleShell host={host}>
          <Router host={host} />
        </ModuleShell>
      </EstimatorProvider>
    </div>
  );
}

export default EstimatorModule;
export type { EngineClient } from "./integration/engineClient";
export { LocalEngineAdapter, RemoteEngineAdapter } from "./integration/engineClient";
export type { EstimatorModuleProps } from "./data/types";
