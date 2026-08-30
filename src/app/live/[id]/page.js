"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, Gift, Users, Radio } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../../components/Banniere";

export default function LiveEnDirect() {
  const { id } = useParams();
  const router = useRouter();
  const [live, setLive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [cadeaux, setCadeaux] = useState([]);
  const [solde, setSolde] = useState(null);
  const [toast, setToast] = useState("");
  const chatRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: l } = await supabase
        .from("lives")
        .select("id, titre, description, statut, url_lecture, cle_stream, createur_id, profiles:pseudo")
        .eq("id", id)
        .single();
      setLive(l);

      const { data: m } = await supabase
        .from("messages_live")
        .select("id, pseudo, texte, created_at")
        .eq("live_id", id)
        .eq("supprime", false)
        .order("created_at", { ascending: false })
        .limit(50);
      setMessages((m || []).reverse());

      const { data: c } = await supabase
        .from("cadeaux")
        .select("*")
        .eq("actif", true)
        .order("cout_tokens", { ascending: true });
      setCadeaux(c || []);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("solde_tokens")
          .eq("id", user.id)
          .single();
        setSolde(profile?.solde_tokens ?? 0);
      }
    }
    load();
  }, [id]);

  // Chat temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`live-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_live", filter: `live_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev.slice(-100), payload.new]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cadeaux_envoyes", filter: `createur_id=eq.${live?.createur_id || "x"}` },
        () => {}
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id, live?.createur_id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  async function envoyer(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();

    await supabase.from("messages_live").insert({
      live_id: id,
      user_id: user.id,
      pseudo: profile?.pseudo,
      texte: texte.trim(),
    });
    setTexte("");
  }

  async function offrirCadeau(cadeau) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");

    const { error } = await supabase.rpc("envoyer_cadeau", {
      p_live_id: id,
      p_cadeau_id: cadeau.id,
    });

    if (error) {
      setToast(error.message);
    } else {
      setToast(`${cadeau.emoji} ${cadeau.nom} envoyé à @${live?.profiles?.pseudo || "créateur"} !`);
      setSolde((s) => s - cadeau.cout_tokens);
    }
    setTimeout(() => setToast(""), 3000);
  }

  if (!live) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center">
        <p className="text-on-surface-variant">Chargement...</p>
      </main>
    );
  }

  const idYoutube = live.url_lecture
    ? live.url_lecture.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  return (
    <main className="pt-24 pb-10 px-5 md:px-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lecteur + chat */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-lowest">
            {live.statut === "en_direct" && live.url_lecture ? (
              idYoutube ? (
                <iframe
                  src={`https://www.youtube.com/embed/${idYoutube[1]}?autoplay=1&rel=0`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video src={live.url_lecture} controls autoPlay className="w-full h-full object-contain" />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <Radio size={48} className="text-primary/40" />
                <p className="body-lg">
                  {live.statut === "programme"
                    ? "Live programmé — le direct démarre bientôt."
                    : "Ce live est terminé."}
                </p>
              </div>
            )}
            {live.statut === "en_direct" && (
              <span className="absolute top-3 left-3 bg-error text-on-error caption font-bold px-2 py-1 rounded">
                ● EN DIRECT
              </span>
            )}
          </div>

          <div>
            <h1 className="headline-md text-on-surface">{live.titre}</h1>
            <p className="body-md text-on-surface-variant mt-1">
              par @{live.profiles?.pseudo || "créateur"} {live.description ? `— ${live.description}` : ""}
            </p>
          </div>

          {/* Cadeaux */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="label-md text-primary uppercase flex items-center gap-2">
                <Gift size={16} /> Offrir un cadeau
              </h2>
              <span className="caption text-on-surface-variant">
                Solde : <span className="text-primary font-bold">{solde ?? "—"} jetons</span>
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              {cadeaux.map((c) => (
                <button
                  key={c.id}
                  onClick={() => offrirCadeau(c)}
                  className="flex-none flex flex-col items-center gap-1 px-4 py-3 rounded-lg border border-outline-variant/30 hover:border-primary bg-surface-container transition-colors"
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="caption text-on-surface">{c.nom}</span>
                  <span className="caption text-primary font-bold">{c.cout_tokens} 🪙</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="glass-panel rounded-xl flex flex-col h-[600px]">
            <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="label-md text-on-surface">Chat en direct</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id}>
                  <span className="caption text-primary font-bold">@{m.pseudo || "anonyme"} </span>
                  <span className="body-md text-on-surface-variant">{m.texte}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="caption text-on-surface-variant">Aucun message — lancez la conversation !</p>
              )}
            </div>
            <form onSubmit={envoyer} className="p-3 border-t border-outline-variant/20 flex gap-2">
              <input
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 bg-surface-variant/50 border-0 rounded-lg text-on-surface px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="bg-primary text-on-primary-fixed rounded-lg px-3 flex items-center justify-center hover:bg-primary-container transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          <div className="mt-6">
            <Banniere emplacement="live_v" className="h-40" />
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-lg px-6 py-3 label-md text-primary">
          {toast}
        </div>
      )}
    </main>
  );
}
