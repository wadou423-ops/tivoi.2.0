"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SLIDES = [
  {
    titre: "VOD Premium",
    texte:
      "Explorez le cinéma ouest-africain avec notre sélection de films haut de gamme et de séries exclusives. Plongez-vous dans des récits authentiques.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIfEm5sw8FYQbGwJAhEpvbK4Fvr2vGuVoieWBmh0d7VhKnd0yAaccA6TiKIrtbTWFXCkqTyYRZDjIPMbL2FXsSDrnYJ38Ude8-aBfsJ8LVzbBdZAAKkmFH0gN8vfP6gzZuEmupCOv6YEdLeFsFNDs_IILr7Je24umgG8NfAs243KOleiONSoT6eixaqdR2L0ZRdeKy2Chaq1qNgoplY7U9aiBmc0UJMiQHKzvlHU73WiqW0TziYWUq",
  },
  {
    titre: "Lives en Direct",
    texte:
      "Connectez-vous directement avec les créateurs et les icônes culturelles en temps réel. Chat, cadeaux virtuels et émotions partagées.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDgEBR9OHRG7yB_7OmC3pxhyEEFnGgJvKXfjWg2yZBaZBN1naR79HbwlLogeT_KDI2syCdItfPPYW8OXEWGsCvUevEnzOpVYVTbLRsfX_7U--BmfV0HQWtDMhobhdCxRpk2Kq6vmD40djqLY8jq2XPckRJtJIrv9fbxH8oyM49fdF52CKaksuyY1TLDEy9uOtQxp4bfeeDbDyKGmZ8d0MhW4Tz2sLoqrTUhJgDC7yD1d9gJqAwy8md7",
  },
  {
    titre: "Chaînes TV",
    texte:
      "Le direct 24h/24. Accédez à une programmation premium de chaînes de télévision : actualités, sport et divertissement en continu.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAnWHCkOT-mRDA0NLQ7TkvBcASRb2VoTHTeRLWTDdvNggo-hLiVRBwE-7VHFyGKkqRiQbOggUYG26tzj-J-GzQrWV32wLogWEYJA1p_zozL0G2pvVgP7lLhxJ6p9vDPu6vqE9GqNtek7SifQD93x2w7jCYZUJqqkraZ2Ad7MFIvWzBtNRIPMQsFFSeJ8PUKfNLjvS2U0HcDLjwrFehsVJRHiPaxZ6MpZ7a3r6A-cpzKszWOPdvX_3c0",
  },
];

export default function Bienvenue() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);

  const suivant = useCallback(() => {
    setSlide((s) => (s + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const t = setInterval(suivant, 6000);
    return () => clearInterval(t);
  }, [suivant]);

  async function terminer(destination) {
    localStorage.setItem("tivoi_onboarding_vu", "1");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_vu: true }).eq("id", user.id);
    }
    router.push(destination);
  }

  return (
    <main className="relative w-full h-screen flex flex-col justify-end overflow-hidden">
      {/* Slides */}
      {SLIDES.map((s, i) => (
        <div
          key={s.titre}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === slide ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${s.image}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full px-5 md:px-20 pb-32 md:pb-36">
            <h1 className="display-lg text-on-surface mb-4 fade-up" key={`t-${i}-${slide}`}>
              {s.titre}
            </h1>
            <p className="body-lg text-on-surface-variant max-w-md fade-up" key={`p-${i}-${slide}`}>
              {s.texte}
            </p>
          </div>
        </div>
      ))}

      {/* Marque + Passer */}
      <div className="absolute top-0 left-0 w-full px-5 md:px-20 py-6 z-20 flex justify-between items-center">
        <button onClick={() => terminer("/")} className="display-lg text-primary tracking-tighter !text-2xl !leading-none">
          TiVoi
        </button>
        <button
          onClick={() => terminer("/catalogue")}
          className="label-md text-on-surface-variant hover:text-primary transition-colors uppercase"
        >
          Passer
        </button>
      </div>

      {/* Barre de contrôle */}
      <div className="glass-panel w-full z-20 px-5 py-6 md:px-20 md:py-8 flex flex-row items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === slide ? "bg-primary w-8" : "bg-surface-variant w-2"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => terminer("/inscription")}
          className="bg-primary text-on-primary label-md uppercase px-8 py-3 rounded hover:bg-primary-container transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          Commencer
        </button>
      </div>
    </main>
  );
}
