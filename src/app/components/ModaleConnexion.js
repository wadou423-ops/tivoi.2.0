"use client";

import Link from "next/link";

// Modale premium : le visiteur doit se connecter pour accéder au contenu
export default function ModaleConnexion({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-xl max-w-md w-full p-8 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
        >
          ✕
        </button>
        <h2 className="font-display font-bold text-3xl text-primary tracking-tight mb-3">TiVoi</h2>
        <p className="body-lg text-on-surface mb-8">
          Connectez-vous pour accéder à ce contenu — films, séries, lives et chaînes TV premium.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/connexion"
            className="bg-primary text-on-primary-fixed label-md px-6 py-3.5 rounded-lg hover:bg-primary-container transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="border border-primary text-primary label-md px-6 py-3.5 rounded-lg hover:bg-primary hover:text-on-primary-fixed transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
