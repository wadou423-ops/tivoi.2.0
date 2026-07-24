"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [autorise, setAutorise] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        setAutorise(false);
        setChecking(false);
        return;
      }

      setAutorise(true);
      setChecking(false);
    }

    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#9AA0AC]">Vérification...</p>
      </main>
    );
  }

  if (!autorise) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#9AA0AC]">Accès réservé aux administrateurs.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-[#1C2029] px-4 py-8 shrink-0">
        <p className="font-display text-lg text-[#E8A33D] mb-6 px-2">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <a href="/admin" className="px-3 py-2 rounded-lg text-[#F4F1EA] hover:bg-[#0F131B] transition">
            Tableau de bord
          </a>
          <a href="/admin/utilisateurs" className="px-3 py-2 rounded-lg text-[#F4F1EA] hover:bg-[#0F131B] transition">
            Utilisateurs
          </a>
          <a href="/admin/vtc" className="px-3 py-2 rounded-lg text-[#F4F1EA] hover:bg-[#0F131B] transition">
            Playlist VTC
          </a>
          <span className="px-3 py-2 rounded-lg text-[#5C6270] cursor-not-allowed">
            Catalogue (bientôt)
          </span>
          <span className="px-3 py-2 rounded-lg text-[#5C6270] cursor-not-allowed">
            Lives (bientôt)
          </span>
          <span className="px-3 py-2 rounded-lg text-[#5C6270] cursor-not-allowed">
            Paiements (bientôt)
          </span>
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}