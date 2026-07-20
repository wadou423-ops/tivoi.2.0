"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (!profile?.pseudo) {
      router.push("/choisir-pseudo");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#0F131B] border border-[#1C2029] rounded-2xl p-8"
      >
        <h1 className="font-display text-3xl text-[#E8A33D] mb-6">
          Se connecter
        </h1>

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
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-center text-[#9AA0AC]">{message}</p>
        )}

        <p className="mt-6 text-sm text-center text-[#9AA0AC]">
          Pas encore de compte ?{" "}
          <a href="/inscription" className="text-[#E8A33D] hover:underline">
            S&apos;inscrire
          </a>
        </p>
      </form>
    </main>
  );
}