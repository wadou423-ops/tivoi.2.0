// Edge Function : wave-checkout
// Crée une session de paiement Wave et renvoie l'URL de paiement.
// Secret requis : WAVE_API_KEY (clé API Wave Business)
// Déploiement :
//   supabase functions deploy wave-checkout
//   supabase secrets set WAVE_API_KEY=ta_cle_api

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { amount, reference, success_url, error_url } = await req.json();

    if (!amount || !reference) {
      return new Response(JSON.stringify({ error: "amount et reference requis" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("WAVE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "WAVE_API_KEY non configurée", non_configure: true }),
        { status: 501, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: "XOF",
        client_reference: reference,
        success_url: success_url ?? undefined,
        error_url: error_url ?? undefined,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
