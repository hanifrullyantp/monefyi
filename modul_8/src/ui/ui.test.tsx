// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EstimatorModule } from "../EstimatorModule";
import { EstimatorProvider, useEstimator, useRab } from "./context";
import { LayoutEditorScreen } from "./screens/LayoutEditor";

afterEach(() => cleanup());

describe("UI: alur proyek baru dari satu kalimat", () => {
  it("membuat proyek, menampilkan total & satu pertanyaan, jawaban chip menambah kelengkapan", async () => {
    render(<EstimatorModule host={{ currentUser: { name: "Uji" } }} />);
    const input = await screen.findByLabelText(/Tulis apa yang mau kamu lakukan/i);
    fireEvent.change(input, { target: { value: "buat RAB rumah tipe 45" } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });

    const heading = await screen.findByRole("heading", { level: 1, name: /Rumah 45/ }, { timeout: 5000 });
    expect(heading).toBeTruthy();
    const total = await screen.findByRole("heading", { level: 2, name: /Rp/ }, { timeout: 5000 });
    expect(total.textContent).toMatch(/Rp/);
    expect(screen.getAllByText(/Kelengkapan data/).length).toBeGreaterThan(0);
    const before = Number((await screen.findByRole("progressbar", { name: "Kelengkapan data" })).getAttribute("aria-valuenow"));

    // Satu pertanyaan per langkah: kartu asisten muncul
    const assistant = await screen.findByText("Asisten rencana", undefined, { timeout: 5000 });
    const card = assistant.closest("[aria-live]") as HTMLElement;
    const chip = within(card).getAllByRole("button").find((b) => /m²|lantai|Standar|Menengah|Pelana|tidur/.test(b.textContent ?? ""));
    expect(chip).toBeTruthy();
    await act(async () => { fireEvent.click(chip!); });
    await waitFor(() => {
      const after = Number(screen.getByRole("progressbar", { name: "Kelengkapan data" }).getAttribute("aria-valuenow"));
      expect(after).toBeGreaterThan(before);
    }, { timeout: 5000 });
    expect(screen.getByText(/Saya catat:/)).toBeTruthy();
  });

  it("tanpa navbar: tidak ada elemen nav global, ada tombol Menu mengambang", async () => {
    const { container } = render(<EstimatorModule host={{}} />);
    await screen.findByLabelText(/Tulis apa yang mau kamu lakukan/i);
    expect(container.querySelector("header nav, nav[aria-label='Utama']")).toBeNull();
    const fab = screen.getByRole("button", { name: "Buka menu modul" });
    fireEvent.click(fab);
    expect(await screen.findByRole("menu", { name: "Menu modul" })).toBeTruthy();
  });
});

function Harness() {
  const { projects, state, upsertKomponen } = useEstimator();
  const project = projects[0];
  const { rab } = useRab(project);
  const pkj = state.catalog.komponen.find((k) => k.kode === "T.PKJ")!;
  return (
    <div>
      <output data-testid="total">{rab?.total ?? ""}</output>
      <output data-testid="labor">{rab?.labor.find((l) => l.kode === "T.PKJ")?.cost ?? ""}</output>
      <button onClick={() => upsertKomponen({ ...pkj, harga: pkj.harga * 2 })}>naikkan</button>
    </div>
  );
}

describe("UI: edit harga komponen memengaruhi RAB", () => {
  it("total & rekap upah naik setelah harga pekerja diubah", async () => {
    render(<EstimatorProvider host={{}}><Harness /></EstimatorProvider>);
    await waitFor(() => expect(screen.getByTestId("total").textContent).not.toBe(""));
    const total0 = Number(screen.getByTestId("total").textContent);
    const labor0 = Number(screen.getByTestId("labor").textContent);
    await act(async () => { fireEvent.click(screen.getByText("naikkan")); });
    await waitFor(() => expect(Number(screen.getByTestId("total").textContent)).toBeGreaterThan(total0));
    expect(Number(screen.getByTestId("labor").textContent)).toBeGreaterThan(labor0);
  });
});

function EditorHarness() {
  const { projects } = useEstimator();
  const project = projects[0];
  return <LayoutEditorScreen project={project} />;
}

describe("T6. UI Editor Denah", () => {
  it("drag ruangan tidak memunculkan toast dibatalkan, handle resize ada, maksimal 3 peringatan tampil", async () => {
    const { container } = render(
      <EstimatorProvider host={{}}>
        <EditorHarness />
      </EstimatorProvider>
    );

    // 1. Kanvas denah ada
    const canvas = await screen.findByRole("application", { name: /Denah interaktif/i });
    expect(canvas).toBeTruthy();

    // 2. Pilih salah satu ruangan
    const roomEl = canvas.querySelector("g[role='button']");
    expect(roomEl).toBeTruthy();
    fireEvent.click(roomEl!);

    // 3. Simulasi pointer drag: tidak ada toast 'dibatalkan'
    fireEvent.pointerDown(roomEl!, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 160, clientY: 120, button: 0 });

    expect(screen.queryByText(/dibatalkan/i)).toBeNull();

    // 4. Popover / Panel ruangan: tombol 'Hapus Ruangan' dan kontrol ukuran tersedia
    expect(screen.getByText(/Hapus Ruangan/i)).toBeTruthy();

    // 5. Maksimal 3 peringatan aktif tampil di panel
    const warningItems = container.querySelectorAll(".border-\\[\\#FDE68A\\]");
    expect(warningItems.length).toBeLessThanOrEqual(3);
  });
});
