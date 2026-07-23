"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("pseudo")
          .eq("id", user.id)
          .single();
        setPseudo(profile?.pseudo || null);
      } else {
        setPseudo(null);
      }
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-6 md:px-12 py-6">
      <a href="/" className="font-display text-3xl tracking-wide text-[#E8A33D]">
        TiVoi
      </a>
      <nav className="hidden md:flex items-center gap-8 text-sm text-[#C7CCD6]">
        <a href="#" className="hover:text-[#F4F1EA] transition">Catalogue</a>
        <a href="#" className="hover:text-[#F4F1EA] transition">Lives</a>
        <a href="#" className="hover:text-[#F4F1EA] transition">Chaînes TV</a>
      </nav>

      {loading ? null : pseudo ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#F4F1EA]">@{pseudo}</span>
          <button
            onClick={handleLogout}
            className="rounded-full border border-[#2A2E38] px-5 py-2 text-sm text-[#9AA0AC] hover:border-[#E8A33D] hover:text-[#F4F1EA] transition"
          >
            Déconnexion
          </button>
        </div>
      ) : (
        <a href="/connexion" className="rounded-full border border-[#E8A33D] px-5 py-2 text-sm text-[#E8A33D] hover:bg-[#E8A33D] hover:text-[#0B0E14] transition">
          Connexion
        </a>
      )}
    </header>
  );
}