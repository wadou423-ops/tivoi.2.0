"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Inscription() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, prenom },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#0F131B] border border-[#1C2029] rounded-2xl p-8"
      >
        <h1 className="font-display text-3xl text-[#E8A33D] mb-6">
          Créer un compte
        </h1>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm text-[#9AA0AC] mb-2">Prénom</label>
            <input
              type="text"
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA] focus:outline-none focus:border-[#E8A33D]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9AA0AC] mb-2">Nom</label>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA] focus:outline-none focus:border-[#E8A33D]"
            />
          </div>
        </div>

        <label className="block text-sm text-[#9AA0AC] mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA] focus:outline-none focus:border-[#E8A33D]"
        />

        <label className="block text-sm text-[#9AA0AC] mb-2">Mot de passe</label>
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-2 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA] focus:outline-none focus:border-[#E8A33D]"
        />

        <label className="flex items-center gap-2 mb-6 text-sm text-[#9AA0AC] cursor-pointer">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="accent-[#E8A33D]"
          />
          Afficher le mot de passe
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#E8A33D] py-3 text-sm font-semibold text-[#0B0E14] hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-center text-[#9AA0AC]">{message}</p>
        )}

        <p className="mt-6 text-sm text-center text-[#9AA0AC]">
          Déjà un compte ?{" "}
          <a href="/connexion" className="text-[#E8A33D] hover:underline">
            Se connecter
          </a>
        </p>
      </form>
    </main>
  );
}