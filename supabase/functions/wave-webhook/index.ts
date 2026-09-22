// Edge Function : wave-webhook
// Reçoit les événements Wave (checkout.session.completed) et confirme le paiement.
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (incluses automatiquement)
// + WAVE_WEBHOOK_SECRET (à définir : supabase secrets set WAVE_WEBHOOK_SECRET=...)
// URL à déclarer dans le dashboard Wave Business :
//   https://<ref>.supabase.co/functions/v1/wave-webhook
//
// SÉCURITÉ : chaque requête est authentifiée par un secret partagé transmis
// dans l'en-tête "x-tivoi-webhook". Wave n'envoie pas ce secret : configurez
// l'en-tête personnalisé côté Wave Business, ou utilisez leur signature
// officielle si disponible. Sans le bon secret → 401, aucune confirmation.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // 1. Authentification de l'appelant (anti-forgery)
    const secret = Deno.env.get("WAVE_WEBHOOK_SECRET");
    const fourni = req.headers.get("x-tivoi-webhook");
    if (!secret || fourni !== secret) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    // 2. Vérifie que le montant annoncé correspond à la commande en base
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

    // 2b. Vérifie le montant : le montant payé chez Wave doit correspondre
    //     au montant du paiement enregistré (anti-manipulation du montant)
    const resCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/paiements?reference=eq.${encodeURIComponent(reference)}&select=montant_fcfa,statut`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );
    const lignes = await resCheck.json();
    const paiement = Array.isArray(lignes) ? lignes[0] : null;
    if (!paiement) {
      return new Response(JSON.stringify({ error: "Référence inconnue" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (paiement.statut !== "en_attente") {
      // Déjà traité (webhook rejoué) : réponse OK pour éviter les retries infinis
      return new Response(JSON.stringify({ ok: true, deja_traite: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const montantWave = Math.round(Number(event.data?.amount ?? event.data?.checkout?.amount ?? 0));
    if (montantWave > 0 && montantWave !== paiement.montant_fcfa) {
      return new Response(JSON.stringify({ error: "Montant incohérent" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Confirme (fonction service_role uniquement)
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