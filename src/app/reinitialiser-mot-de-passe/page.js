"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ReinitialiserMotDePasse() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (password !== confirm) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setOk(true);
      setTimeout(() => router.push("/"), 2000);
    }
  }

  return (
    <main className="flex-grow flex items-center justify-center py-16 px-5">
      <div className="glass-panel rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="display-lg text-primary tracking-tight mb-3">TiVoi</h1>
          <p className="text-on-surface-variant">Nouveau mot de passe</p>
        </div>

        {ok ? (
          <p className="text-center body-lg text-primary">
            Mot de passe mis à jour ! Redirection...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-md text-on-surface mb-2 block">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
            <div>
              <label className="label-md text-on-surface mb-2 block">Confirmer</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary label-md py-4 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {loading ? "Mise à jour..." : "Valider"}
            </button>
            {message && <p className="text-sm text-center text-on-surface-variant">{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
