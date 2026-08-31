"use client";

import { useEffect, useState } from "react";
import { Monitor, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../components/LoaderCentered";

export default function AdminAppareils() {
  const [appareils, setAppareils] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase
      .from("appareils")
      .select("*")
      .order("created_at", { ascending: false });
    setAppareils(data || []);
    setChargement(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  async function activer(e) {
    e.preventDefault();
    setMessage("");
    const { data } = await supabase
      .from("appareils")
      .select("id, appaire")
      .eq("code_activation", code.trim())
      .maybeSingle();
    if (!data) {
      setMessage("Code introuvable.");
      return;
    }
    if (data.appaire) {
      setMessage("Cet appareil est déjà activé.");
      return;
    }
    const { error } = await supabase
      .from("appareils")
      .update({ appaire: true })
      .eq("id", data.id);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage("Appareil activé avec succès.");
      setCode("");
      load();
    }
  }

  if (chargement) {
    return <LoaderCentered />;
  }

  return (
    <main className="px-6 md:px-12 py-12 max-w-3xl">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">
        Écrans & appareils
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Tablettes VTC et Smart TV enregistrées sur la plateforme.
      </p>

      {/* Activer par code */}
      <form onSubmit={activer} className="glass-panel rounded-xl p-6 mb-8">
        <h2 className="title-lg text-primary mb-2">Activer un appareil</h2>
        <p className="caption text-on-surface-variant mb-4">
          Saisis le code affiché par la tablette ou la TV au premier démarrage.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="flex-1 bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors font-mono text-2xl tracking-[0.5em] text-center"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary-container text-on-primary label-md px-6 rounded-lg hover:bg-primary transition-colors"
          >
            <Check size={16} /> Activer
          </button>
        </div>
        {message && <p className="caption text-on-surface-variant mt-3">{message}</p>}
      </form>

      {/* Liste */}
      <div className="space-y-2">
        {appareils.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-low px-4 py-3"
          >
            <Monitor size={20} className="text-primary shrink-0" />
            <div className="flex-1">
              <p className="body-md text-on-surface">{a.nom || `Appareil ${a.code_activation}`}</p>
              <p className="caption text-on-surface-variant">
                {a.type.toUpperCase()} · Code {a.code_activation}
              </p>
            </div>
            <span
              className={`caption px-2 py-1 rounded border ${
                a.appaire
                  ? "border-primary text-primary bg-primary/10"
                  : "border-outline-variant text-on-surface-variant"
              }`}
            >
              {a.appaire ? "Activé" : "En attente"}
            </span>
          </div>
        ))}
        {appareils.length === 0 && (
          <p className="text-on-surface-variant">Aucun appareil enregistré.</p>
        )}
      </div>
    </main>
  );
}
