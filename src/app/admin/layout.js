"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ListVideo,
  Film,
  Radio,
  Megaphone,
  Star,
  Tv,
  BadgeCheck,
  Wallet,
  MapPin,
  Shield,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "../components/Spinner";

// Permission requise pour chaque page admin (null = accessible à tous)
const MENU_ADMIN = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard, perm: null },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users, perm: "utilisateurs" },
  { label: "Validation créateurs", href: "/admin/createurs", icon: BadgeCheck, perm: "createurs" },
  { label: "Catalogue VOD", href: "/admin/catalogue", icon: Film, perm: "catalogue" },
  { label: "Contenus à la une", href: "/admin/a-une", icon: Star, perm: "a_une" },
  { label: "Chaînes TV", href: "/admin/chaines", icon: Tv, perm: "chaines" },
  { label: "Bannières & pubs", href: "/admin/bannieres", icon: Megaphone, perm: "bannieres" },
  { label: "Demandes de retrait", href: "/admin/retraits", icon: Wallet, perm: "retraits" },
  { label: "Playlist VTC", href: "/admin/vtc", icon: ListVideo, perm: "vtc" },
  { label: "Administrateurs", href: "/admin/administrateurs", icon: Shield, perm: "administrateurs" },
];

const NAV_FUTUR = [
  { label: "Lives (modération)", icon: Radio },
  { label: "DOOH géociblé", icon: MapPin },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [autorise, setAutorise] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminPseudo, setAdminPseudo] = useState("");
  const [permissions, setPermissions] = useState([]);

  const estPageConnexion = pathname === "/admin/connexion";

  useEffect(() => {
    if (estPageConnexion) return;

    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/connexion");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, pseudo, permissions")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        // Session client détectée : on demande de se connecter au portail (sans déconnexion forcée)
        router.replace("/admin/connexion?refuse=1");
        return;
      }

      setAdminPseudo(profile.pseudo || user.email);
      setPermissions(profile.permissions || []);
      setAutorise(true);
      setChecking(false);
    }

    checkAdmin();
  }, [router, estPageConnexion]);

  // Page de connexion admin : rendue seule, sans sidebar ni protection
  if (estPageConnexion) {
    return <>{children}</>;
  }

  if (checking || !autorise) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner size={36} />
      </main>
    );
  }

  // Garde centralisé : la page est-elle permise à cet admin ?
  const page = MENU_ADMIN.find(
    (p) => p.perm && (pathname === p.href || pathname.startsWith(p.href + "/"))
  );
  const permRefusee = page && !permissions.includes(page.perm);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex flex-col w-72 border-r border-outline-variant/10 bg-surface px-6 py-8 shrink-0 fixed left-0 top-0 h-screen z-40">
        <div className="mb-8 mt-2 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container/20 border-2 border-primary/20 flex items-center justify-center">
            <span className="font-display font-bold text-primary text-lg">T</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-primary">TiVoi Admin</h1>
            <p className="text-xs text-on-surface-variant">Connecté : @{adminPseudo}</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 mt-4 overflow-y-auto">
          {MENU_ADMIN.filter((item) => !item.perm || permissions.includes(item.perm)).map((item) => {
            const actif =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  actif
                    ? "text-primary font-bold border-r-2 border-primary bg-primary-container/10"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </a>
            );
          })}
          <div className="my-3 border-t border-outline-variant/20" />
          {NAV_FUTUR.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-on-surface-variant/50 cursor-not-allowed"
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </span>
          ))}
          <div className="my-3 border-t border-outline-variant/20" />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/admin/connexion");
            }}
            className="flex items-center gap-4 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-error transition-colors w-full text-left"
          >
            <LogOut size={18} />
            <span className="text-sm">Déconnexion</span>
          </button>
        </nav>
      </aside>
      <div className="flex-1 md:ml-72">
        {permRefusee ? (
          <main className="px-6 md:px-12 py-16 text-center">
            <Shield size={48} className="text-outline mx-auto mb-4" />
            <p className="headline-md text-on-surface mb-2">Accès non autorisé</p>
            <p className="body-md text-on-surface-variant">
              Votre profil ne dispose pas de l&apos;attribution « {page.perm} ».
              Contactez un administrateur principal.
            </p>
          </main>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
