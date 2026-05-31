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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const { url, anonKey } = resolveSupabaseFromProcess(env);

  return {
    plugins: [react(), tailwindcss(), viteSingleFile()],
    // Vercel Supabase integration exposes NEXT_PUBLIC_*; map all safe client vars into VITE_* at build.
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      ...(url ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url) } : {}),
      ...(anonKey
        ? { "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(anonKey) }
        : {}),
      ...(url ? { "import.meta.env.SUPABASE_URL": JSON.stringify(url) } : {}),
      ...(anonKey
        ? { "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(anonKey) }
        : {}),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
