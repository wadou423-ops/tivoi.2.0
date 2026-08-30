"use client";

import { useState } from "react";
import { Upload, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "./Spinner";

export default function UploadFichier({ url, onChange, label = "Image" }) {
  const [upload, setUpload] = useState(false);
  const [erreur, setErreur] = useState("");

  async function televerser(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setUpload(true);
    setErreur("");

    const ext = fichier.name.split(".").pop();
    const chemin = `tivoi/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: errUpload } = await supabase.storage
      .from("media")
      .upload(chemin, fichier, { upsert: false });

    if (errUpload) {
      setErreur(errUpload.message);
      setUpload(false);
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(chemin);
    onChange(data.publicUrl);
    setUpload(false);
  }

  return (
    <div>
      <label className="caption text-on-surface-variant block mb-1">
        {label} — fichier ou URL
      </label>
      <div className="flex gap-2">
        <label className="flex-none cursor-pointer flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-2 caption text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
          {upload ? <Spinner size={14} /> : <Upload size={14} />}
          {upload ? "Envoi..." : "Fichier"}
          <input type="file" accept="image/*,video/*" onChange={televerser} className="hidden" disabled={upload} />
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-3 py-2 outline-none focus:border-primary-container transition-colors text-sm"
        />
      </div>
      {url && !upload && (
        <p className="caption text-primary mt-1 flex items-center gap-1">
          <Check size={12} /> Fichier prêt
        </p>
      )}
      {erreur && <p className="caption text-error mt-1">{erreur}</p>}
    </div>
  );
}
