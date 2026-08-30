"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setLoading(false);
    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setEnvoye(true);
    }
  }

  return (
    <main className="flex-grow flex items-center justify-center py-16 px-5">
      <div className="glass-panel rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="display-lg text-primary tracking-tight mb-3">TiVoi</h1>
          <p className="text-on-surface-variant">Récupération de compte</p>
        </div>

        {envoye ? (
          <div className="text-center">
            <p className="body-lg text-on-surface mb-4">Email envoyé !</p>
            <p className="body-md text-on-surface-variant mb-8">
              Consultez votre boîte mail et suivez le lien pour réinitialiser votre mot de passe.
            </p>
            <Link href="/connexion" className="text-primary label-md hover:text-primary-container">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-md text-on-surface mb-2 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary label-md py-4 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Recevoir le lien"}
            </button>
            {message && <p className="text-sm text-center text-on-surface-variant">{message}</p>}
            <p className="text-center">
              <Link href="/connexion" className="caption text-on-surface-variant hover:text-primary">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
