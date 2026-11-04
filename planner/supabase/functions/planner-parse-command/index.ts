import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/** Salinan ini tidak di-deploy. Sumber deploy: my-supabase-project/supabase/functions/planner-parse-command */
serve(() =>
  new Response(
    JSON.stringify({
      code: "salinan_tidak_dipakai",
      message_id: "salinan_tidak_dipakai",
      fix_hint: "Deploy function dari my-supabase-project/supabase/functions.",
      valid_options: [],
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
