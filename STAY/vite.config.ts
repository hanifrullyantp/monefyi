import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSupabaseFromProcess(env: Record<string, string>) {
  const url =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "";
  const anonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    "";
  return { url, anonKey };
}

function resolveXenditFnUrl(env: Record<string, string>, supabaseUrl: string) {
  const explicit = env.VITE_XENDIT_FN_URL || "";
  if (explicit) return explicit.replace(/\/$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stay-xendit`;
  }
  return "";
}

function resolveStayAiFnUrl(env: Record<string, string>, supabaseUrl: string) {
  const explicit = env.VITE_STAY_AI_FN_URL || "";
  if (explicit) return explicit.replace(/\/$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stay-ai`;
  }
  return "";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const { url, anonKey } = resolveSupabaseFromProcess(env);
  const xenditFnUrl = resolveXenditFnUrl(env, url);
  const stayAiFnUrl = resolveStayAiFnUrl(env, url);

  return {
    base: "/stay/",
    plugins: [react(), tailwindcss(), viteSingleFile()],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      ...(url ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url) } : {}),
      ...(anonKey
        ? { "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(anonKey) }
        : {}),
      ...(xenditFnUrl
        ? { "import.meta.env.VITE_XENDIT_FN_URL": JSON.stringify(xenditFnUrl) }
        : {}),
      ...(stayAiFnUrl
        ? { "import.meta.env.VITE_STAY_AI_FN_URL": JSON.stringify(stayAiFnUrl) }
        : {}),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "../dist/stay"),
      emptyOutDir: true,
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: false,
      open: "/stay/",
    },
    preview: {
      host: "localhost",
      port: 5173,
      open: "/stay/",
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
