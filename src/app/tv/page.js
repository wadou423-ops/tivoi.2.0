"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

function SpinnerKiosque() {
  return (
    <svg className="animate-spin" width={44} height={44} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(212,175,55,0.18)" strokeWidth="2.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="#f2ca50" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TV() {
  const [appareil, setAppareil] = useState(null);
  const [enroleCharge, setEnroleCharge] = useState(false);
  const [proprietaire, setProprietaire] = useState(null);
  const [films, setFilms] = useState([]);
  const [aLaUne, setALaUne] = useState([]);
  const [qrFilm, setQrFilm] = useState(null);

  const zoneRef = useRef(null);

  // 1. Enrôlement de la TV
  useEffect(() => {
    async function enroler() {
      let id = localStorage.getItem("tivoi-tv-id");
      if (id) {
        const { data } = await supabase
          .from("appareils")
          .select("id, code_activation, appaire, proprietaire_id")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setAppareil(data);
          setEnroleCharge(true);
          return;
        }
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { data: nouveau } = await supabase
        .from("appareils")
        .insert({ code_activation: code, type: "tv", nom: `Smart TV ${code}` })
        .select("id, code_activation, appaire")
        .single();
      if (nouveau) {
        localStorage.setItem("tivoi-tv-id", nouveau.id);
        setAppareil(nouveau);
      }
      setEnroleCharge(true);
    }
    enroler();
  }, []);

  // 2. Polling : la TV attend d'être appairée au compte du client
  useEffect(() => {
    if (!appareil || appareil.appaire) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("appareils")
        .select("appaire, proprietaire_id")
        .eq("id", appareil.id)
        .maybeSingle();
      if (data?.appaire && data.proprietaire_id) {
        setAppareil((a) => ({ ...a, appaire: true, proprietaire_id: data.proprietaire_id }));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [appareil]);

  // 3. Une fois appairée : pseudo du propriétaire + catalogue
  useEffect(() => {
    if (!appareil?.appaire || !appareil.proprietaire_id) return;
    async function load() {
      const { data: prof } = await supabase
        .from("profiles")
        .select("pseudo")
        .eq("id", appareil.proprietaire_id)
        .single();
      setProprietaire(prof?.pseudo || null);

      const [{ data: cat }, { data: une }] = await Promise.all([
        supabase
          .from("catalogue")
          .select("id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces")
          .eq("actif", true)
          .order("ordre", { ascending: true }),
        supabase
          .from("a_une")
          .select("ordre, catalogue(id, titre, image_url, categorie, note, badge, prix_fcfa, type_acces)")
          .eq("actif", true)
          .order("ordre", { ascending: true }),
      ]);
      setFilms(cat || []);
      setALaUne((une || []).filter((s) => s.catalogue).map((s) => ({ ...s.catalogue })));
    }
    load();
  }, [appareil?.appaire, appareil?.proprietaire_id]);

  // 4. Navigation télécommande (flèches) : focus spatial entre les cartes
  const naviguer = useCallback((direction) => {
    const elems = Array.from(
      zoneRef.current?.querySelectorAll("[data-tv]") || []
    );
    if (elems.length === 0) return;
    const actif = document.activeElement;
    const idx = elems.indexOf(actif);
    if (idx === -1) {
      elems[0].focus();
      return;
    }
    const rect = actif.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let meilleur = null;
    let meilleureDist = Infinity;
    elems.forEach((el) => {
      if (el === actif) return;
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = ex - cx;
      const dy = ey - cy;
      const dansLaDirection =
        (direction === "droite" && dx > 10 && Math.abs(dy) < Math.abs(dx) * 1.5) ||
        (direction === "gauche" && dx < -10 && Math.abs(dy) < Math.abs(dx) * 1.5) ||
        (direction === "bas" && dy > 10 && Math.abs(dx) < Math.abs(dy) * 1.5) ||
        (direction === "haut" && dy < -10 && Math.abs(dx) < Math.abs(dy) * 1.5);
      if (dansLaDirection) {
        const d = dx * dx + dy * dy;
        if (d < meilleureDist) {
          meilleureDist = d;
          meilleur = el;
        }
      }
    });
    if (meilleur) meilleur.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      const m = {
        ArrowRight: "droite",
        ArrowLeft: "gauche",
        ArrowDown: "bas",
        ArrowUp: "haut",
      };
      if (m[e.key]) {
        e.preventDefault();
        naviguer(m[e.key]);
      }
    }
    if (appareil?.appaire) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [appareil?.appaire, naviguer]);

  // ── Écran d'appairage ──
  if (!enroleCharge || !appareil) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <SpinnerKiosque />
      </main>
    );
  }

  if (!appareil.appaire) {
    return (
      <main className="min-h-screen bg-surface-lowest flex flex-col items-center justify-center select-none">
        <h1 className="font-display font-bold text-4xl text-primary mb-10 tracking-tight">TiVoi</h1>
        <p className="label-md text-on-surface-variant uppercase tracking-widest mb-8">
          Connectez votre compte
        </p>
        <div className="flex gap-3 mb-10">
          {appareil.code_activation.split("").map((c, i) => (
            <span
              key={i}
              className="w-16 h-20 md:w-20 md:h-24 rounded-xl glass-panel flex items-center justify-center text-4xl font-mono font-bold text-primary"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SpinnerKiosque />
          <p className="body-lg text-on-surface-variant">
            Saisissez ce code sur tivoi.com/parametres depuis votre téléphone
          </p>
        </div>
      </main>
    );
  }

  // ── Interface TV (comme Netflix) ──
  const categories = [...new Set(films.map((f) => f.categorie).filter(Boolean))];
  const tendances = [...films]
    .sort((a, b) => (b.note || 0) - (a.note || 0))
    .slice(0, 10);

  function Rangée({ titre, liste }) {
    if (!liste || liste.length === 0) return null;
    return (
      <section className="px-16 pt-8 pb-4">
        <h2 className="headline-md text-on-surface mb-4">{titre}</h2>
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {liste.map((film) => {
            const payant = film.type_acces !== "gratuit";
            return (
              <button
                key={film.id}
                data-tv
                onClick={() => payant && setQrFilm(film)}
                className="flex-none w-[220px] text-left rounded-lg outline-none focus:ring-4 focus:ring-primary focus:scale-105 transition-all"
              >
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-surface-high border border-outline-variant/10">
                  {film.image_url && (
                    <img src={film.image_url} alt={film.titre} className="w-full h-full object-cover" />
                  )}
                  {payant && (
                    <span className="absolute bottom-2 right-2 caption px-2 py-0.5 rounded bg-surface-lowest/80 text-primary border border-primary/30">
                      {film.type_acces === "abonnement" ? "VIP" : `${film.prix_fcfa} F`}
                    </span>
                  )}
                </div>
                <h3 className="body-md text-on-surface truncate mt-2">{film.titre}</h3>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-surface-lowest pb-10">
      <header className="flex justify-between items-center px-16 py-6 border-b border-outline-variant/10">
        <h1 className="font-display font-bold text-3xl text-primary tracking-tight">TiVoi</h1>
        <p className="body-md text-on-surface-variant">
          Connecté à <span className="text-primary font-semibold">@{proprietaire || "—"}</span>
        </p>
      </header>

      <div ref={zoneRef}>
        <Rangée titre="À la une" liste={aLaUne} />
        <Rangée titre="Top 10 aujourd'hui" liste={tendances} />
        {categories.map((cat) => (
          <Rangée key={cat} titre={cat} liste={films.filter((f) => f.categorie === cat)} />
        ))}
      </div>

      <p className="px-16 caption text-outline mt-6">
        Naviguez avec les flèches de votre télécommande · Les contenus VIP se débloquent sur
        votre téléphone
      </p>

      {/* QR : débloquer un contenu payant sur le téléphone du client */}
      {qrFilm && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setQrFilm(null)}
        >
          <div
            className="glass-panel rounded-xl p-8 text-center max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="title-lg text-on-surface mb-1">{qrFilm.titre}</h2>
            <p className="caption text-on-surface-variant mb-5">
              Scannez ce code avec votre téléphone pour débloquer ce contenu
              {qrFilm.type_acces === "abonnement"
                ? " (abonnement)"
                : ` (${qrFilm.prix_fcfa} FCFA)`}
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                window.location.origin + (qrFilm.type_acces === "abonnement" ? "/abonnements" : `/paiement/achat/${qrFilm.id}`)
              )}`}
              alt="QR code"
              className="mx-auto rounded-lg bg-white p-2"
            />
            <button
              onClick={() => setQrFilm(null)}
              className="mt-5 caption text-on-surface-variant hover:text-primary transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
