"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Banniere({ emplacement, className = "" }) {
  const [banniere, setBanniere] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("bannieres")
        .select("*")
        .eq("emplacement", emplacement)
        .eq("actif", true)
        .limit(1);
      if (data && data.length > 0) {
        setBanniere(data[0]);
        supabase.rpc("banniere_impression", { p_id: data[0].id });
      }
    }
    load();
  }, [emplacement]);

  if (!banniere) return null;

  return (
    <a
      href={banniere.lien || "#"}
      target={banniere.lien ? "_blank" : undefined}
      onClick={() => supabase.rpc("banniere_clic", { p_id: banniere.id })}
      className={`block relative overflow-hidden rounded-xl border border-primary-container/10 ${className}`}
    >
      <img src={banniere.image_url} alt={banniere.titre || "Publicité"} className="w-full h-full object-cover" />
      <span className="absolute bottom-2 right-2 caption bg-surface-lowest/70 text-on-surface-variant px-2 py-0.5 rounded">
        Publicité
      </span>
    </a>
  );
}
