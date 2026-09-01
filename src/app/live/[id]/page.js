"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import IconeMS from "../../components/IconeMS";
import { supabase } from "@/lib/supabaseClient";
import Banniere from "../../components/Banniere";
import LoaderCentered from "../../components/LoaderCentered";
import YoutubeDirect from "../../components/YoutubeDirect";

function nouvelId() {
  return Date.now() + Math.random();
}

function clePresence() {
  return Math.random().toString(36).slice(2, 9);
}

function positionAleatoire() {
  return 5 + Math.random() * 80;
}

export default function LiveEnDirect() {
  const { id } = useParams();
  const router = useRouter();
  const [live, setLive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [cadeaux, setCadeaux] = useState([]);
  const [solde, setSolde] = useState(null);
  const [toast, setToast] = useState("");
  const [spectateurs, setSpectateurs] = useState(0);
  const [reactions, setReactions] = useState([]);
  const [cadeauxVolants, setCadeauxVolants] = useState([]);
  const [estCreateur, setEstCreateur] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const [chargementLive, setChargementLive] = useState(true);
  const [urlEdit, setUrlEdit] = useState("");
  const [savingStream, setSavingStream] = useState(false);
  const chatRef = useRef(null);
  const videoDirectRef = useRef(null);
  const heurePauseDirect = useRef(null);

  function rattraperDirect() {
    const v = videoDirectRef.current;
    if (!v || !heurePauseDirect.current) return;
    const ecart = (Date.now() - heurePauseDirect.current) / 1000;
    heurePauseDirect.current = null;
    if (ecart > 3 && v.duration && isFinite(v.duration)) {
      v.currentTime = Math.min(v.currentTime + ecart, v.duration - 1);
    }
    v.play();
  }

  // Quitter l'onglet pendant un direct MP4 : pause (le son s'arrÃªte)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" && live?.statut === "en_direct" && videoDirectRef.current && !videoDirectRef.current.paused) {
        heurePauseDirect.current = Date.now();
        videoDirectRef.current.pause();
      } else if (document.visibilityState === "visible" && live?.statut === "en_direct" && videoDirectRef.current?.paused) {
        rattraperDirect();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [live?.statut]);

  useEffect(() => {
    async function load() {
      const { data: l, error: errLive } = await supabase
        .from("lives")
        .select("id, titre, description, statut, url_lecture, cle_stream, createur_id, profiles(pseudo)")
        .eq("id", id)
        .single();
      if (errLive) {
        console.error("[TiVoi] Erreur chargement live :", errLive.message);
      }
      setLive(l);
      // Identifie le crÃ©ateur (pour lui permettre de gÃ©rer son direct)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && l) {
        setEstCreateur(l.createur_id === user.id);
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setEstAdmin(profil?.role === "admin");
      }
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

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("solde_tokens")
          .eq("id", user.id)
          .single();
        setSolde(profile?.solde_tokens ?? 0);
      }
      setChargementLive(false);
    }
    load();
  }, [id]);

  function ajouterReaction(emoji) {
    const item = { id: nouvelId(), emoji, left: positionAleatoire() };
    setReactions((r) => [...r, item]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== item.id)), 3000);
  }

  function ajouterCadeauVolant(emoji) {
    const item = { id: nouvelId(), emoji };
    setCadeauxVolants((c) => [...c, item]);
    setTimeout(() => setCadeauxVolants((c) => c.filter((x) => x.id !== item.id)), 4200);
  }

  async function envoyerReaction(emoji) {
    ajouterReaction(emoji);
    const channel = supabase.getChannels().find((c) => c.topic === `live-${id}`);
    if (channel) {
      await channel.send({ type: "broadcast", event: "reaction", payload: { emoji } });
    }
  }

  // Chat temps rÃ©el + prÃ©sence + rÃ©actions + cadeaux animÃ©s
  useEffect(() => {
    const channel = supabase
      .channel(`live-${id}`, { config: { presence: { key: clePresence() } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_live", filter: `live_id=eq.${id}` },
        (payload) => {
          // DÃ©duplique avec l'affichage optimiste
          setMessages((prev) => {
            const doublon = prev.some(
              (m) =>
                String(m.id).startsWith("optimiste-") &&
                m.pseudo === payload.new.pseudo &&
                m.texte === payload.new.texte
            );
            if (doublon) {
              return prev.map((m) =>
                String(m.id).startsWith("optimiste-") &&
                m.pseudo === payload.new.pseudo &&
                m.texte === payload.new.texte
                  ? payload.new
                  : m
              );
            }
            return [...prev.slice(-100), payload.new];
          });
        }
      )
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        ajouterReaction(payload.emoji);
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cadeaux_envoyes", filter: `live_id=eq.${id}` },
        async (payload) => {
          const { data: c } = await supabase
            .from("cadeaux")
            .select("emoji, nom")
            .eq("id", payload.new.cadeau_id)
            .single();
          if (c) ajouterCadeauVolant(c.emoji);
        }
      )
      .on("presence", { event: "sync" }, () => {
        setSpectateurs(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, [id]);

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

    // Affichage optimiste : le message apparaÃ®t instantanÃ©ment
    const tempId = `optimiste-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, pseudo: profile?.pseudo, texte: texte.trim() },
    ]);
    setTexte("");

    await supabase.from("messages_live").insert({
      live_id: id,
      user_id: user.id,
      pseudo: profile?.pseudo,
      texte: texte.trim(),
    });
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
      setToast(`${cadeau.emoji} ${cadeau.nom} envoyÃ© Ã  @${live?.profiles?.pseudo || "crÃ©ateur"} !`);
      ajouterCadeauVolant(cadeau.emoji);
      setSolde((s) => s - cadeau.cout_tokens);
    }
    setTimeout(() => setToast(""), 3000);
  }

  if (chargementLive) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 flex items-center justify-center">
        <LoaderCentered />
      </main>
    );
  }

  if (!live) {
    return (
      <main className="pt-28 pb-20 px-5 md:px-20 text-center">
        <p className="text-on-surface-variant">Ce live n&apos;existe pas ou a Ã©tÃ© supprimÃ©.</p>
      </main>
    );
  }

  const idYoutube = live.url_lecture
    ? live.url_lecture.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  const EMOJIS_REACTION = ["â¤ï¸", "ðŸ”¥", "ðŸ‘", "ðŸ˜®", "ðŸ˜‚"];

  return (
    <main className="pt-24 pb-10 px-5 md:px-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lecteur + chat */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-lowest">
            {live.statut === "en_direct" && live.url_lecture ? (
              idYoutube ? (
                <YoutubeDirect videoId={idYoutube[1]} onEnded={() => setLive((l) => ({ ...l, statut: "termine" }))} />
              ) : (
                <video
                  ref={videoDirectRef}
                  src={live.url_lecture}
                  controls
                  autoPlay
                  onPause={() => (heurePauseDirect.current = Date.now())}
                  onPlay={() => rattraperDirect()}
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <IconeMS nom="live_tv" taille={52} rempli={false} className="text-primary/40" />
                <p className="body-lg">
                  {live.statut === "programme"
                    ? "Live programmÃ© â€” le direct dÃ©marre bientÃ´t."
                    : "Ce live est terminÃ©."}
                </p>
              </div>
            )}
            {live.statut === "en_direct" && (
              <span className="absolute top-3 left-3 bg-error text-on-error caption font-bold px-2 py-1 rounded pulse-live">
                â— EN DIRECT
              </span>
            )}
            {/* Compteur spectateurs + quitter le direct */}
            <span className="absolute top-3 right-3 bg-surface-lowest/70 backdrop-blur-md caption text-on-surface px-2.5 py-1 rounded flex items-center gap-1.5">
              <IconeMS nom="visibility" taille={13} rempli={false} className="text-primary" /> {spectateurs}
            </span>
            <button
              onClick={() => router.push("/lives")}
              className="absolute top-12 right-3 bg-surface-lowest/70 backdrop-blur-md caption text-on-surface px-2.5 py-1 rounded flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              â† Quitter le direct
            </button>

            {/* Cadeaux qui traversent l'Ã©cran */}
            {cadeauxVolants.map((c) => (
              <span
                key={c.id}
                className="absolute top-1/3 text-5xl gift-fly pointer-events-none"
                style={{ left: "-15vw" }}
              >
                {c.emoji}
              </span>
            ))}

            {/* RÃ©actions flottantes */}
            {reactions.map((r) => (
              <span
                key={r.id}
                className="absolute bottom-16 text-3xl reaction-float pointer-events-none"
                style={{ left: `${r.left}%` }}
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {/* Barre de rÃ©actions */}
          <div className="flex items-center gap-2">
            {EMOJIS_REACTION.map((e) => (
              <button
                key={e}
                onClick={() => envoyerReaction(e)}
                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform"
              >
                {e}
              </button>
            ))}
            <span className="caption text-on-surface-variant ml-2">
              RÃ©agis en direct â€” tout le monde voit tes emojis
            </span>
          </div>

          <div>
            <h1 className="headline-md text-on-surface">{live.titre}</h1>
            <p className="body-md text-on-surface-variant mt-1">
              par @{live.profiles?.pseudo || "crÃ©ateur"} {live.description ? `â€” ${live.description}` : ""}
            </p>
          </div>

          {/* Panneau du crÃ©ateur : URL du flux + dÃ©marrage/arrÃªt du direct */}
          {(estCreateur || estAdmin) && (
            <div className="glass-panel rounded-xl p-5">
              <h2 className="label-md text-primary uppercase mb-3 flex items-center gap-2">
                <IconeMS nom="settings_input_antenna" taille={18} rempli={false} /> RÃ©glages du direct (visible par le crÃ©ateur)
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <input
                  value={urlEdit || live.url_lecture || ""}
                  onChange={(e) => setUrlEdit(e.target.value)}
                  placeholder="URL du flux (ex : https://www.youtube.com/watch?v=...)"
                  className="flex-1 bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors text-sm"
                />
                <button
                  onClick={async () => {
                    setSavingStream(true);
                    await supabase
                      .from("lives")
                      .update({ url_lecture: urlEdit || live.url_lecture || null })
                      .eq("id", id);
                    setLive((l) => ({ ...l, url_lecture: urlEdit || l.url_lecture }));
                    setUrlEdit("");
                    setSavingStream(false);
                    setToast("URL du flux enregistrÃ©e.");
                    setTimeout(() => setToast(""), 3000);
                  }}
                  disabled={savingStream}
                  className="border border-outline-variant text-on-surface-variant label-md px-5 py-3 rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {savingStream ? "Enregistrement..." : "Enregistrer l'URL"}
                </button>
                {live.statut === "en_direct" ? (
                  <button
                    onClick={async () => {
                      await supabase.from("lives").update({ statut: "termine" }).eq("id", id);
                      setLive((l) => ({ ...l, statut: "termine" }));
                    }}
                    className="border border-error text-error label-md px-5 py-3 rounded-lg hover:bg-error/10 transition-colors whitespace-nowrap"
                  >
                    ArrÃªter le direct
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await supabase.from("lives").update({ statut: "en_direct" }).eq("id", id);
                      setLive((l) => ({ ...l, statut: "en_direct" }));
                    }}
                    className="bg-primary text-on-primary-fixed label-md px-5 py-3 rounded-lg hover:bg-primary-container transition-colors whitespace-nowrap"
                  >
                    DÃ©marrer le direct
                  </button>
                )}
                <p className="caption text-on-surface-variant w-full sm:w-auto">
                  ClÃ© de stream : <span className="font-mono text-primary">{live.cle_stream}</span>
                </p>
              </div>
            </div>
          )}

          {/* Cadeaux */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="label-md text-primary uppercase flex items-center gap-2">
                <IconeMS nom="redeem" taille={18} /> Offrir un cadeau
              </h2>
              <span className="caption text-on-surface-variant">
                Solde : <span className="text-primary font-bold">{solde ?? "â€”"} jetons</span>
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
                  <span className="caption text-primary font-bold">{c.cout_tokens} ðŸª™</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="glass-panel rounded-xl flex flex-col h-[600px]">
            <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2">
              <IconeMS nom="visibility" taille={16} rempli={false} className="text-primary" />
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
                <p className="caption text-on-surface-variant">Aucun message â€” lancez la conversation !</p>
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
                <IconeMS nom="send" taille={18} rempli={false} />
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
