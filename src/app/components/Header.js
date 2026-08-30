"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Menu, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [pseudo, setPseudo] = useState(null);
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("pseudo, role")
          .eq("id", user.id)
          .single();
        setPseudo(profile?.pseudo || null);
        setRole(profile?.role || null);
      } else {
        setPseudo(null);
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
    { label: "Live", href: "/lives" },
    { label: "TV", href: "/guide-tv" },
  ];

  // Écrans plein écran sans navigation
  if (["/bienvenue", "/vtc", "/tv"].includes(pathname)) return null;

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/10 shadow-md shadow-primary/5">
      <div className="flex justify-between items-center px-5 md:px-20 h-20 w-full relative">
        <div className="flex items-center gap-8">
          <Link href="/" className="display-lg text-primary tracking-tighter !text-2xl !leading-none">
            TiVoi
          </Link>
        </div>

        <div className="hidden md:flex gap-6 items-center absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`label-md pb-1 transition-colors ${
                pathname === link.href
                  ? "text-primary border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/recherche" className="text-on-surface hover:text-primary transition-colors">
            <Search size={20} />
          </Link>
          <Link href="/notifications" className="hidden md:block text-on-surface hover:text-primary transition-colors">
            <Bell size={20} />
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <span className="label-md text-on-surface-variant hover:text-primary transition-colors cursor-default">FR/EN</span>
            {loading ? null : pseudo ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-container text-on-primary font-title text-sm font-bold hover:opacity-80 transition-opacity"
                >
                  {pseudo.charAt(0).toUpperCase()}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-low border border-outline-variant shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-outline-variant/40">
                      <p className="title-lg text-on-surface">@{pseudo}</p>
                      {role === "admin" && (
                        <Link href="/admin" className="block px-0 py-1 text-sm text-primary hover:text-primary-container transition-colors">
                          Dashboard admin
                        </Link>
                      )}
                      {role === "createur" ? (
                        <Link href="/studio" className="block px-0 py-1 text-sm text-primary hover:text-primary-container transition-colors">
                          Studio créateur
                        </Link>
                      ) : (
                        <Link href="/devenir-createur" className="block px-0 py-1 text-sm text-primary hover:text-primary-container transition-colors">
                          Devenir créateur
                        </Link>
                      )}
                      <Link href="/profil" className="block py-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
                        Mon profil
                      </Link>
                      <Link href="/parametres" className="block py-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
                        Paramètres du compte
                      </Link>
                    </div>
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
              <Link
                href="/connexion"
                className="label-md bg-primary-container text-on-primary px-4 py-2 rounded font-bold hover:opacity-80 transition-opacity"
              >
                Connexion
              </Link>
            )}
          </div>
          <button className="md:hidden text-on-surface">
            <Menu size={22} />
          </button>
        </div>
      </div>
    </nav>
  );
}
