"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [pseudo, setPseudo] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nonLues, setNonLues] = useState(0);
  const [userId, setUserId] = useState(null);
  const menuRef = useRef(null);

  // Notifications non lues en temps réel (cloche)
  useEffect(() => {
    if (!userId) {
      const t = setTimeout(() => setNonLues(0), 0);
      return () => clearTimeout(t);
    }
    async function charger() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("lu", false);
      setNonLues(count || 0);
    }
    charger();

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => charger()
      )
      .subscribe();

    const onFocus = () => charger();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("pseudo, role")
          .eq("id", user.id)
          .single();
        // Un compte admin n'est jamais affiché comme connecté sur le site client
        if (profile?.role === "admin") {
          setPseudo(null);
          setRole("admin");
        } else {
          setPseudo(profile?.pseudo || null);
          setRole(profile?.role || null);
        }
      } else {
        setUserId(null);
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

  // Écrans plein écran et back-office : sans navigation publique
  if (["/bienvenue", "/vtc", "/tv"].includes(pathname) || pathname.startsWith("/admin")) {
    return null;
  }

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
          <Link href="/notifications" className="relative hidden md:block text-on-surface hover:text-primary transition-colors">
            <Bell size={20} />
            {nonLues > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error caption font-bold flex items-center justify-center">
                {nonLues > 9 ? "9+" : nonLues}
              </span>
            )}
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <span className="label-md text-on-surface-variant hover:text-primary transition-colors cursor-default">FR/EN</span>
            {loading ? (
              <div className="w-9 h-9 rounded-full skeleton" />
            ) : pseudo ? (
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
                      {role === "createur" && (
                        <Link href="/studio" className="block px-0 py-1 text-sm text-primary hover:text-primary-container transition-colors">
                          Studio créateur
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
          <button className="md:hidden text-on-surface" onClick={() => setDrawerOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-72 bg-surface border-l border-outline-variant/20 p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="font-display font-bold text-xl text-primary">TiVoi</span>
              <button onClick={() => setDrawerOpen(false)} className="text-on-surface-variant hover:text-primary">
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-title font-semibold transition-colors ${
                    pathname === l.href
                      ? "text-primary bg-primary/10"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/portefeuille"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-3 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
              >
                Portefeuille
              </Link>
              <Link
                href="/notifications"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-3 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
              >
                Notifications
              </Link>
            </nav>

            <div className="mt-auto border-t border-outline-variant/20 pt-4">
              {loading ? null : pseudo ? (
                <>
                  <Link
                    href="/profil"
                    onClick={() => setDrawerOpen(false)}
                    className="block px-4 py-3 rounded-lg text-sm text-on-surface hover:bg-surface-variant/50"
                  >
                    @{pseudo}
                  </Link>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm text-error hover:bg-error/10"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/connexion"
                  onClick={() => setDrawerOpen(false)}
                  className="block text-center bg-primary-container text-on-primary label-md px-4 py-3 rounded-lg"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
