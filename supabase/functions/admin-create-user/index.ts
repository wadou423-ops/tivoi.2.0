// Edge Function : admin-create-user
// Crée un compte administrateur (appelée uniquement par un admin connecté).
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (incluses automatiquement)
// Déploiement :
//   supabase functions deploy admin-create-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 1. Vérifier que l'appelant est bien un admin (via son JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const clientAsUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await clientAsUser.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await clientAsUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2. Créer le compte admin avec le service role
    const { email, password, nom, prenom } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "email et mot de passe requis" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: created, error: errCreate } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom: nom ?? "", prenom: prenom ?? "" },
    });

    if (errCreate) {
      return new Response(JSON.stringify({ error: errCreate.message }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 3. Promouvoir le nouveau compte en admin
    const { error: errRole } = await adminClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", created.user.id);

    if (errRole) {
      return new Response(JSON.stringify({ error: errRole.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
