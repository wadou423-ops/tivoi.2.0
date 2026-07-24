"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState(null);
  const [email, setEmail] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("pseudo, role")
          .eq("id", user.id)
          .single();
        setPseudo(profile?.pseudo || null);
        setRole(profile?.role || null);
      } else {
        setPseudo(null);
        setEmail(null);
        setRole(null);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-6 md:px-12 py-6">
      <a href="/" className="font-display text-3xl tracking-wide text-[#E8A33D]">TiVoi</a>
      <nav className="hidden md:flex items-center gap-8 text-sm text-[#C7CCD6]">
        <a href="#" className="hover:text-[#F4F1EA] transition">Catalogue</a>
        <a href="#" className="hover:text-[#F4F1EA] transition">Lives</a>
        <a href="#" className="hover:text-[#F4F1EA] transition">Chaînes TV</a>
      </nav>

      {loading ? null : pseudo ? (
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center justify-center w-10 h-10 rounded-full border border-[#2A2E38] hover:border-[#E8A33D] transition">
            <User size={18} className="text-[#F4F1EA]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0F131B] border border-[#1C2029] shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-[#1C2029]">
                <p className="text-sm text-[#F4F1EA]">@{pseudo}</p>
                <p className="text-xs text-[#9AA0AC] truncate">{email}</p>
              </div>{role === "admin" && (
                <a href="/admin" className="block px-4 py-2 text-sm text-[#9AA0AC] hover:text-[#F4F1EA] hover:bg-[#1C2029] transition">Dashboard admin</a>
              )}
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-[#9AA0AC] hover:text-[#F4F1EA] hover:bg-[#1C2029] transition">
                Déconnexion
              </button>
            </div>
          )}
        </div>
      ) : (
        <a href="/connexion" className="rounded-full border border-[#E8A33D] px-5 py-2 text-sm text-[#E8A33D] hover:bg-[#E8A33D] hover:text-[#0B0E14] transition">Connexion</a>
      )}
    </header>
  );
}