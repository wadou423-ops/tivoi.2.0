"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Search, Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
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

  const navLinks = [
    { label: "VOD", href: "/catalogue" },
    { label: "Lives", href: "#" },
    { label: "TV", href: "#" },
  ];

  return (
    <nav className="relative w-full bg-[#131313]/70 backdrop-blur-xl border-b border-[#D4AF37]/10 flex items-center px-6 md:px-12 py-4">
      <a href="/" className="font-heading text-2xl font-bold text-[#F2CA50] tracking-tight">TiVoi</a>

      <ul className="hidden md:flex gap-8 font-heading text-sm absolute left-1/2 -translate-x-1/2">
        {navLinks.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={pathname === link.href ? "text-[#F2CA50] font-bold border-b-2 border-[#F2CA50] pb-1" : "text-[#D0C5AF] hover:text-[#F2CA50] transition-colors"}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-5 ml-auto">
        <div className="relative hidden md:block">
          <input placeholder="Rechercher..." className="bg-transparent border-b border-[#4D4635] focus:border-[#F2CA50] outline-none py-1 pl-2 pr-7 w-40 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/50 transition-colors" />
          <Search size={15} className="absolute right-1 top-1.5 text-[#D0C5AF] pointer-events-none" />
        </div>

        <button className="hidden sm:block text-xs font-heading text-[#D0C5AF] hover:text-[#F2CA50] transition-colors">FR/EN</button>

        <button className="text-[#D0C5AF] hover:text-[#F2CA50] transition-colors">
          <Bell size={18} />
        </button>

        {loading ? null : pseudo ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center justify-center w-9 h-9 rounded-full border border-[#4D4635] hover:border-[#F2CA50] transition-colors">
              <User size={16} className="text-[#E5E2E1]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1A1A1A] border border-[#4D4635] shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-[#4D4635]">
                  <p className="text-sm text-[#E5E2E1] font-heading">@{pseudo}</p>
                  <p className="text-xs text-[#D0C5AF] truncate">{email}</p>
                </div>
                {role === "admin" && (
                  <a href="/admin" className="block px-4 py-2 text-sm text-[#D0C5AF] hover:text-[#F2CA50] hover:bg-[#131313] transition-colors">Dashboard admin</a>
                )}
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-[#D0C5AF] hover:text-[#F2CA50] hover:bg-[#131313] transition-colors">Déconnexion</button>
              </div>
            )}
          </div>
        ) : (
          <a href="/connexion" className="rounded-full border border-[#F2CA50] px-5 py-2 text-sm text-[#F2CA50] hover:bg-[#F2CA50] hover:text-[#131313] transition-colors">Connexion</a>
        )}
      </div>
    </nav>
  );
}