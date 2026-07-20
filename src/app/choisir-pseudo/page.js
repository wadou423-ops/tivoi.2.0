"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ChoisirPseudo() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }
      setChecking(false);
    }
    checkUser();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({ pseudo })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setMessage("Ce pseudo est déjà pris, choisis-en un autre.");
      } else {
        setMessage(`Erreur : ${error.message}`);
      }
    } else {
      router.push("/");
      router.refresh();
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#9AA0AC]">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#0F131B] border border-[#1C2029] rounded-2xl p-8"
      >
        <h1 className="font-display text-3xl text-[#E8A33D] mb-2">
          Choisis ton pseudo
        </h1>
        <p className="text-sm text-[#9AA0AC] mb-6">
          C&apos;est le nom que les autres verront sur TiVoi.
        </p>

        <input
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          title="Lettres, chiffres et underscore uniquement"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="ex: konan_ci"
          className="w-full mb-6 rounded-lg bg-[#0B0E14] border border-[#2A2E38] px-4 py-2 text-[#F4F1EA] focus:outline-none focus:border-[#E8A33D]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#E8A33D] py-3 text-sm font-semibold text-[#0B0E14] hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? "Validation..." : "Valider mon pseudo"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-center text-[#9AA0AC]">{message}</p>
        )}
      </form>
    </main>
  );
}