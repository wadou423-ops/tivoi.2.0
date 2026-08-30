// Edge Function : wave-webhook
// Reçoit les événements Wave (checkout.session.completed) et confirme le paiement.
// Secret requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (incluses automatiquement)
// URL à déclarer dans le dashboard Wave Business :
//   https://<ref>.supabase.co/functions/v1/wave-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const event = await req.json();

    // Wave envoie type = "checkout.session.completed" quand le paiement est payé
    const estComplete =
      event.type === "checkout.session.completed" ||
      event.data?.payment_status === "succeeded";

    if (!estComplete) {
      return new Response(JSON.stringify({ ignore: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reference =
      event.data?.client_reference || event.data?.checkout?.client_reference;

    if (!reference) {
      return new Response(JSON.stringify({ error: "client_reference manquant" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirmer_paiement_webhook`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_reference: reference }),
    });

    return new Response(JSON.stringify({ ok: res.ok }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
