"use client";

import { Users, ListVideo, Film, Radio, Megaphone } from "lucide-react";

export default function AdminHome() {
  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display font-bold text-3xl text-primary mb-2">Tableau de bord</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Vue d&apos;ensemble de TiVoi.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <a
          href="/admin/utilisateurs"
          className="block rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover"
        >
          <Users size={22} className="text-primary mb-3" />
          <h2 className="font-display font-semibold text-lg text-on-surface">Utilisateurs</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Gérer les comptes et les rôles.
          </p>
        </a>
        <a
          href="/admin/vtc"
          className="block rounded-xl border border-primary-container/10 bg-surface-low p-8 card-hover"
        >
          <ListVideo size={20} className="text-primary mb-3" />
          <h2 className="font-display font-semibold text-lg text-on-surface">Playlist VTC</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Gérer le contenu et les publicités.
          </p>
        </a>
        <div className="block rounded-xl border border-outline-variant/20 bg-surface-low p-8 opacity-50">
          <Film size={20} className="text-on-surface-variant mb-3" />
          <h2 className="font-display font-semibold text-lg text-on-surface">Catalogue</h2>
          <p className="text-sm text-on-surface-variant mt-2">Bientôt disponible.</p>
        </div>
        <div className="block rounded-xl border border-outline-variant/10 bg-surface-low p-8 opacity-50 md:col-start-1">
          <Radio size={20} className="text-on-surface-variant mb-3" />
          <h2 className="font-display font-semibold text-lg text-on-surface">Lives</h2>
          <p className="text-sm text-on-surface-variant mt-2">Bientôt disponible.</p>
        </div>
        <div className="block rounded-xl border border-outline-variant/10 bg-surface-low p-8 opacity-50">
          <Megaphone size={20} className="text-on-surface-variant mb-3" />
          <h2 className="font-display font-semibold text-lg text-on-surface">Publicité</h2>
          <p className="text-sm text-on-surface-variant mt-2">Bientôt disponible.</p>
        </div>
      </div>
    </main>
  );
}
