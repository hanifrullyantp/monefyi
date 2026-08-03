// Supabase Edge Function stub for Xendit invoice creation
// Deploy: supabase functions deploy stay-xendit

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const body = await req.json();
    const externalId = `xnd-${body.bookingId}-${Date.now()}`;

    // TODO: Call Xendit API with Deno.env.get('XENDIT_SECRET_KEY')
    const invoiceUrl = `https://checkout.xendit.co/web/${externalId}`;

    return new Response(
      JSON.stringify({ invoice_url: invoiceUrl, external_id: externalId }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
