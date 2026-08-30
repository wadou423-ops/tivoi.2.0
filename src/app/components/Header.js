"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
    <nav className="relative w-full glass-panel border-b border-primary-container/10 flex items-center px-6 md:px-20 py-4">
      <Link href="/" className="font-display text-2xl font-bold text-primary tracking-tight">
        TiVoi
      </Link>

      <ul className="hidden md:flex gap-8 font-title text-sm absolute left-1/2 -translate-x-1/2">
        {navLinks.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className={
                pathname === link.href
                  ? "text-primary font-bold border-b-2 border-primary pb-1"
                  : "text-on-surface-variant hover:text-primary transition-colors"
              }
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-5 ml-auto">
        <div className="relative hidden md:block">
          <input
            placeholder="Rechercher..."
            className="bg-transparent border-b border-outline-variant focus:border-primary outline-none py-1 pl-2 pr-7 w-40 text-sm text-on-surface-variant placeholder:text-on-surface-variant/50 transition-colors"
          />
          <Search size={15} className="absolute right-1 top-1.5 text-on-surface-variant pointer-events-none" />
        </div>

        <button className="hidden sm:block text-xs font-title font-semibold tracking-[0.05em] text-on-surface-variant hover:text-primary transition-colors">
          FR/EN
        </button>

        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <Bell size={18} />
        </button>

        {loading ? null : pseudo ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-outline-variant hover:border-primary transition-colors"
            >
              <User size={16} className="text-on-surface" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-low border border-outline-variant shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-outline-variant/40">
                  <p className="text-sm text-on-surface font-title font-semibold">@{pseudo}</p>
                  <p className="text-xs text-on-surface-variant truncate">{email}</p>
                </div>
                {role === "admin" && (
                  <a
                    href="/admin"
                    className="block px-4 py-2 text-sm text-on-surface-variant hover:text-primary hover:bg-surface transition-colors"
                  >
                    Dashboard admin
                  </a>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface-variant hover:text-primary hover:bg-surface transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <a
            href="/connexion"
            className="rounded-lg border border-primary px-5 py-2 text-sm text-primary hover:bg-primary hover:text-on-primary transition-colors"
          >
            Connexion
          </a>
        )}
      </div>
    </nav>
  );
}
