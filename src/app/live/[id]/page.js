"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cacheListe } from "@/lib/cache";
import Banniere from "../../components/Banniere";
import LoaderCentered from "../../components/LoaderCentered";
import Spinner from "../../components/Spinner";
import YoutubeDirect from "../../components/YoutubeDirect";
import LecteurHLS from "../../components/LecteurHLS";
import InvitationsAntenne from "./components/InvitationsAntenne";
import SlidesDirect from "./components/SlidesDirect";
import { SERVEUR_DIFFUSION_HTTP, DIFFUSION_EN_DEMO, urlHlsDuLive } from "@/lib/config";

function nouvelId() {
  return Date.now() + Math.random();
}

function clePresence() {
  // Clé stable par navigateur (persistée) : les rechargements et les onglets
  // ne gonflent plus artificiellement le compteur de spectateurs
  let k = null;
  try { k = localStorage.getItem("tivoi-presence-id"); } catch {}
  if (!k) {
    k = "a-" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try { localStorage.setItem("tivoi-presence-id", k); } catch {}
  }
  return k;
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
  const [estModerateur, setEstModerateur] = useState(false);
  const [compte, setCompte] = useState("");
  const [chargementLive, setChargementLive] = useState(true);
  const [urlEdit, setUrlEdit] = useState("");
  const [savingStream, setSavingStream] = useState(false);
  const [enregistrements, setEnregistrements] = useState([]);
  const [recSelectionne, setRecSelectionne] = useState(null);
  const [enregistreEnCours, setEnregistreEnCours] = useState(false);
  const [dureeRec, setDureeRec] = useState(0);
  const [envoiRec, setEnvoiRec] = useState(false);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const chatInputRef = useRef(null);
  const chatRef = useRef(null);
  const videoDirectRef = useRef(null);
  const heurePauseDirect = useRef(null);
  const dernierEnvoiRef = useRef(0);
  const userIdRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRecRef = useRef(null);

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

  // Quitter l'onglet pendant un direct MP4 : pause (le son s'arrête)
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
        .select("id, titre, description, statut, url_lecture, rediffusion_url, programme_a, en_pause, createur_id, profiles(pseudo)")
        .eq("id", id)
        .single();
      if (errLive) {
        console.error("[TiVoi] Erreur chargement live :", errLive.message);
      }
      setLive(l);
      // Identifie le créateur (pour lui permettre de gérer son direct)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && l) {
        setEstCreateur(l.createur_id === user.id);
        userIdRef.current = user.id;
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setEstAdmin(profil?.role === "admin");
        // Modérateur ? (choisi et accepté) — vérifié AVANT l'audience
        const { data: mod } = await supabase
          .from("moderateurs_live")
          .select("id, statut")
          .eq("createur_id", l.createur_id)
          .eq("utilisateur_id", user.id)
          .eq("statut", "acceptee")
          .maybeSingle();
        setEstModerateur(!!mod);
        // L'audience = les spectateurs uniquement : le créateur, l'admin
        // et les modérateurs ne sont pas comptés comme spectateurs
        const personnel = l.createur_id === user.id || profil?.role === "admin" || !!mod;
        if (!personnel) {
          await supabase
            .from("lives_spectateurs")
            .upsert({ live_id: id, user_id: user.id, depart_a: null }, { onConflict: "live_id,user_id" });
        }
      }
      const { data: m } = await supabase
        .from("messages_live")
        .select("id, pseudo, texte, created_at")
        .eq("live_id", id)
        .eq("supprime", false)
        .order("created_at", { ascending: false })
        .limit(50);
      setMessages((m || []).reverse());

      // Enregistrements du direct (= les rediffusions)
      const { data: recs } = await supabase
        .from("lives_enregistrements")
        .select("id, chemin, duree_secondes, taille_octets, created_at")
        .eq("live_id", id)
        .order("created_at", { ascending: false });
      setEnregistrements(recs || []);
      setRecSelectionne(recs?.[0]?.id ?? null);

      const c = await cacheListe("cadeaux", async () => {
        const { data } = await supabase
          .from("cadeaux")
          .select("*")
          .eq("actif", true)
          .order("cout_tokens", { ascending: true });
        return data || [];
      }, 300000);
      setCadeaux(c);

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

  // À la sortie de la page : marque le départ du spectateur (audience réelle)
  useEffect(() => {
    return () => {
      const uid = userIdRef.current;
      if (!uid) return;
      supabase
        .from("lives_spectateurs")
        .update({ depart_a: new Date().toISOString() })
        .eq("live_id", id)
        .eq("user_id", uid)
        .is("depart_a", null);
    };
  }, [id]);

  // Compte à rebours pour un live programmé
  useEffect(() => {
    if (live?.statut !== "programme" || !live?.programme_a) {
      queueMicrotask(() => setCompte(""));
      return;
    }
    const cible = new Date(live.programme_a).getTime();
    const maj = () => {
      const reste = cible - Date.now();
      if (reste <= 0) {
        setCompte("ça démarre !");
        return;
      }
      const h = Math.floor(reste / 3600000);
      const mn = Math.floor((reste % 3600000) / 60000);
      const s = Math.floor((reste % 60000) / 1000);
      setCompte(`${h ? h + "h " : ""}${String(mn).padStart(2, "0")}mn ${String(s).padStart(2, "0")}s`);
    };
    const t = setInterval(maj, 1000);
    queueMicrotask(maj);
    return () => clearInterval(t);
  }, [live?.statut, live?.programme_a]);

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

  // Chat temps réel + présence + réactions + cadeaux animés
  useEffect(() => {
    const channel = supabase
      .channel(`live-${id}`, {
        config: { presence: { key: userIdRef.current ? `u-${userIdRef.current}` : clePresence() } },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_live", filter: `live_id=eq.${id}` },
        (payload) => {
          // Déduplique avec l'affichage optimiste
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
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${id}` },
        ({ new: maj }) => {
          // Le créateur démarre/arrête, ou la rediffusion devient disponible :
          // les spectateurs le voient immédiatement, sans recharger
          setLive((old) => ({ ...old, ...maj }));
        }
      )
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
        // Compteur = spectateurs identifiés uniquement (clés "u-<userid>") :
        // le créateur, l'admin et les modérateurs ne se trackent pas
        const cles = Object.keys(channel.presenceState());
        setSpectateurs(cles.filter((k) => k.startsWith("u-")).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Seuls les spectateurs identifiés se trackent (préfixe "u-") :
          // le créateur / admin / modérateurs n'entrent pas dans le compteur
          if (userIdRef.current && !estCreateur && !estAdmin && !estModerateur) {
            await channel.track({ at: Date.now() });
          }
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
    if (live?.statut !== "en_direct") {
      setToast("Le chat ouvre quand le direct démarre.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    // Anti-spam : 3 secondes minimum entre deux messages
    if (Date.now() - dernierEnvoiRef.current < 3000) {
      setToast("Patiente quelques secondes entre deux messages.");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    dernierEnvoiRef.current = Date.now();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();

    // Affichage optimiste : le message apparaît instantanément
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

  async function supprimerMessage(mid) {
    await supabase.rpc("supprimer_message_live", { p_message_id: mid });
    setMessages((prev) =>
      prev.map((m) => (m.id === mid ? { ...m, texte: "[message supprimé]", supprime: true } : m))
    );
  }

  // ---------- Enregistrement du direct (= la rediffusion) ----------
  function demarrerEnregistrement() {
    const v = videoDirectRef.current;
    if (!v || typeof v.captureStream !== "function") {
      setToast("Enregistrement impossible sur cette source.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    try {
      const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(v.captureStream(), mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = finEnregistrement;
      rec.start(1000);
      mediaRecorderRef.current = rec;
      setDureeRec(0);
      setEnregistreEnCours(true);
      timerRecRef.current = setInterval(() => setDureeRec((d) => d + 1), 1000);
      setToast("● Enregistrement en cours...");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setToast(`Enregistrement impossible : ${e.message}`);
      setTimeout(() => setToast(""), 3000);
    }
  }

  function arreterEnregistrement() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function finEnregistrement() {
    clearInterval(timerRecRef.current);
    setEnregistreEnCours(false);
    const duree = dureeRec;
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    if (!blob.size) return;

    if (blob.size > 500 * 1024 * 1024) {
      setToast("Enregistrement trop volumineux (> 500 Mo) — découpe-le ou attends le serveur.");
      setTimeout(() => setToast(""), 4000);
      return;
    }

    setEnvoiRec(true);
    setToast("Sauvegarde de l'enregistrement...");
    const chemin = `rediffusions/${id}/${Date.now()}.webm`;
    const { error: errUpload } = await supabase.storage
      .from("media")
      .upload(chemin, blob, { contentType: "video/webm", upsert: false });
    if (errUpload) {
      setToast(`Erreur de sauvegarde : ${errUpload.message}`);
      setTimeout(() => setToast(""), 4000);
      setEnvoiRec(false);
      return;
    }
    await supabase.from("lives_enregistrements").insert({
      live_id: id,
      createur_id: userIdRef.current,
      chemin,
      duree_secondes: duree,
      taille_octets: blob.size,
    });
    const { data: recs } = await supabase
      .from("lives_enregistrements")
      .select("id, chemin, duree_secondes, taille_octets, created_at")
      .eq("live_id", id)
      .order("created_at", { ascending: false });
    setEnregistrements(recs || []);
    setRecSelectionne(recs?.[0]?.id ?? null);
    setEnvoiRec(false);
    setToast("Enregistrement sauvegardé — disponible dans ton studio.");
    setTimeout(() => setToast(""), 3500);
  }

  function urlEnregistrement(rec) {
    const { data } = supabase.storage.from("media").getPublicUrl(rec.chemin);
    return data.publicUrl;
  }

  async function supprimerEnregistrement(rec) {
    if (!confirm("Supprimer cet enregistrement ?")) return;
    await supabase.storage.from("media").remove([rec.chemin]);
    await supabase.from("lives_enregistrements").delete().eq("id", rec.id);
    setEnregistrements((l) => l.filter((r) => r.id !== rec.id));
    setRecSelectionne((s) => (s === rec.id ? null : s));
    setToast("Enregistrement supprimé.");
    setTimeout(() => setToast(""), 2500);
  }

  async function telechargerEnregistrement(rec, titre) {
    const { data } = await supabase.storage.from("media").download(rec.chemin);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(titre || "rediffusion").replace(/[^a-zA-Z0-9_-]+/g, "_")}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function offrirCadeau(cadeau) {
    if (live?.statut !== "en_direct") return;
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
        <p className="text-on-surface-variant">Ce live n&apos;existe pas ou a été supprimé.</p>
      </main>
    );
  }

  const idYoutube = live.url_lecture
    ? live.url_lecture.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  const idYoutubeRediff = live.rediffusion_url
    ? live.rediffusion_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/)
    : null;

  // VOD du direct terminé : l'enregistrement sélectionné (sinon l'ancienne
  // rediffusion_url, pour compatibilité avec les tests précédents)
  const recActive = enregistrements.find((r) => r.id === recSelectionne) || enregistrements[0] || null;
  const vodLocale = recActive ? urlEnregistrement(recActive) : null;

  const peutModerer = estCreateur || estAdmin || estModerateur;
  // L'enregistrement capture la vidéo qui joue dans la salle (source MP4/WebM)
  const sourceLocale = live.url_lecture && !idYoutube && /\.(mp4|webm|mov)(\?|#|$)/i.test(live.url_lecture);

  const EMOJIS_REACTION = ["❤️", "🔥", "👏", "😮", "😂"];

  // ----- Mode cockpit plein écran (créateur/admin pendant son direct) -----
  const enPleinEcran = (estCreateur || estAdmin) && live.statut === "en_direct";

  // Contenu du lecteur, partagé entre le mode plein écran et le layout normal
  const contenuLecteur = (
    <>
      {live.statut === "en_direct" && live.en_pause ? (
        // Direct en pause par le créateur : le flux est démonté
        // (la lecture s'arrête réellement chez tous les spectateurs)
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant bg-black">
          <i className="ph-duotone ph-pause-circle text-primary/60" style={{ fontSize: 64 }} aria-hidden="true" />
          <p className="body-lg">Direct en pause</p>
          {estCreateur || estAdmin ? (
            <button
              onClick={async () => {
                await supabase.from("lives").update({ en_pause: false }).eq("id", id);
                setLive((l) => ({ ...l, en_pause: false }));
              }}
              className="bg-primary text-on-primary-fixed label-md px-6 py-3 rounded-lg hover:bg-primary-container transition-colors mt-2"
            >
              Reprendre le direct
            </button>
          ) : (
            <p className="caption text-on-surface-variant">Le créateur reprendra dans un instant.</p>
          )}
        </div>
      ) : live.statut === "termine" && (vodLocale || live.rediffusion_url) ? (
        // Le direct terminé : lecture directe de l'enregistrement
        idYoutubeRediff && !vodLocale ? (
          <iframe
            src={`https://www.youtube.com/embed/${idYoutubeRediff[1]}?rel=0`}
            title="Rediffusion du direct"
            allow="autoplay; encrypted-media"
            className="w-full h-full"
          />
        ) : (
          <video
            src={vodLocale || live.rediffusion_url}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
          />
        )
      ) : live.statut === "en_direct" && live.mode === "rtmp" ? (
        // Mode caméra : flux HLS servi par le serveur de diffusion
        DIFFUSION_EN_DEMO ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <i className="ph-duotone ph-broadcast text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
            <p className="body-lg">Diffusion caméra (OBS / téléphone)</p>
            <p className="caption text-on-surface-variant max-w-md text-center">
              Mode démo — le serveur de diffusion n&apos;est pas encore connecté.
              Pour l&apos;instant, collez une URL YouTube dans les réglages du créateur.
            </p>
          </div>
        ) : (
          <LecteurHLS src={urlHlsDuLive(live.id)} />
        )
      ) : live.statut === "en_direct" && !live.url_lecture ? (
        // En direct mais pas encore de source : le créateur colle son URL
        // dans les réglages, le spectateur attend
        estCreateur || estAdmin ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <i className="ph-duotone ph-broadcast text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
            <p className="body-lg">Ton direct est lancé</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <i className="ph-duotone ph-television text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
            <p className="body-lg">Le direct va démarrer d&apos;un instant à l&apos;autre...</p>
          </div>
        )
      ) : live.statut === "en_direct" && live.url_lecture ? (
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
          <i className="ph-duotone ph-television text-primary/40" style={{ fontSize: 52 }} aria-hidden="true" />
          <p className="body-lg">
            {live.statut === "programme" ? "Live programmé" : "Ce direct est terminé."}
          </p>
          {live.statut === "programme" && compte && (
            <p className="label-md text-primary font-mono">{compte}</p>
          )}
          {live.statut === "annule" && <p className="body-lg">Ce live a été annulé.</p>}
          {live.statut === "termine" && (
            <p className="caption text-on-surface-variant max-w-md text-center">
              {estCreateur || estAdmin
                ? "Les enregistrements de ce direct apparaissent dans ⚙ Réglages et dans ton studio."
                : "La rediffusion n'est pas encore disponible. Reviens bientôt."}
            </p>
          )}
        </div>
      )}
    </>
  );

  // Lecteur complet (contenu + badges + effets), utilisé par les deux layouts
  const lecteurComplet = (
    <div
      className={
        enPleinEcran
          ? "absolute inset-0 bg-black"
          : "relative aspect-video rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-lowest"
      }
    >
      {contenuLecteur}
      {/* Badge EN DIRECT : dans le bandeau du cockpit, sinon sur le lecteur */}
      {live.statut === "en_direct" && !enPleinEcran && (
        <span className="absolute top-3 left-3 bg-error text-on-error caption font-bold px-2 py-1 rounded pulse-live">
          ● EN DIRECT
        </span>
      )}
      {/* Compteur spectateurs + quitter le direct (sauf pour le créateur :
          il gère son antenne, il ne la "quitte" pas) */}
      <span className="absolute top-3 right-3 bg-surface-lowest/70 backdrop-blur-md caption text-on-surface px-2.5 py-1 rounded flex items-center gap-1.5">
        <i className="ph-duotone ph-eye text-primary" style={{ fontSize: 13 }} aria-hidden="true" /> {spectateurs}
      </span>
      {!estCreateur && (
        <button
          onClick={() => router.push("/lives")}
          className="absolute top-12 right-3 bg-surface-lowest/70 backdrop-blur-md caption text-on-surface px-2.5 py-1 rounded flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          ← Quitter le direct
        </button>
      )}

      {/* Cadeaux qui traversent l'écran */}
      {cadeauxVolants.map((c) => (
        <span
          key={c.id}
          className="absolute top-1/3 text-5xl gift-fly pointer-events-none"
          style={{ left: "-15vw" }}
        >
          {c.emoji}
        </span>
      ))}

      {/* Réactions flottantes */}
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
  );

  // Panneau créateur (administratif du direct) — affiché dans ⚙ Réglages
  // en mode cockpit, ou sous le lecteur dans le layout normal
  const panneauCreateurJSX = (
    <div className="bg-surface-low border border-outline-variant rounded-xl p-5">
      <h2 className="label-md text-primary uppercase mb-3 flex items-center gap-2">
        <i className="ph-duotone ph-broadcast" style={{ fontSize: 18 }} aria-hidden="true" /> Réglages du direct
      </h2>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <input
          value={urlEdit || live.url_lecture || ""}
          onChange={(e) => setUrlEdit(e.target.value)}
          placeholder="URL du flux (ex : https://www.youtube.com/watch?v=...)"
          className="flex-1 bg-surface-low border border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-outline transition-colors text-sm"
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
            setToast("URL du flux enregistrée.");
            setTimeout(() => setToast(""), 3000);
          }}
          disabled={savingStream}
          className="border border-outline-variant text-on-surface-variant label-md px-5 py-3 rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {savingStream ? "Enregistrement..." : "Enregistrer l'URL"}
        </button>
        {live.statut === "programme" && (
          <button
            onClick={async () => {
              await supabase.from("lives").update({ statut: "annule" }).eq("id", id);
              setLive((l) => ({ ...l, statut: "annule" }));
              router.push("/lives");
            }}
            className="border border-outline-variant text-on-surface-variant label-md px-5 py-3 rounded-lg hover:text-error transition-colors whitespace-nowrap"
          >
            Annuler ce live
          </button>
        )}
      </div>

      {/* Mode démo diffusion caméra */}
      {DIFFUSION_EN_DEMO && (
        <p className="caption text-on-surface-variant mt-3 border border-outline-variant/30 rounded-lg px-4 py-3">
          Mode démo — diffusion caméra (OBS / téléphone) disponible à l&apos;activation du
          serveur. Pour l&apos;instant, collez une URL YouTube ou MP4 ci-dessus.
        </p>
      )}

      {/* Enregistrements du direct : ouvrir, télécharger, supprimer */}
      {enregistrements.length > 0 && (estCreateur || estAdmin) && (
        <div className="mt-3 border border-outline-variant/30 rounded-lg p-4">
          <h3 className="label-md text-primary uppercase mb-3 flex items-center gap-2">
            <i className="ph-duotone ph-film-strip" style={{ fontSize: 16 }} aria-hidden="true" /> Enregistrements ({enregistrements.length})
          </h3>
          <div className="divide-y divide-outline-variant/20">
            {enregistrements.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="caption text-on-surface">
                    Enregistrement #{enregistrements.length - i}
                    {recSelectionne === r.id && " · affiché dans le lecteur"}
                  </p>
                  <p className="caption text-outline mt-0.5">
                    {Math.floor(r.duree_secondes / 60)}mn · {(r.taille_octets / (1024 * 1024)).toFixed(1)} Mo ·{" "}
                    {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => { setRecSelectionne(r.id); setReglagesOuverts(false); }} className="caption text-primary hover:underline">
                    Ouvrir
                  </button>
                  <button onClick={() => telechargerEnregistrement(r, live.titre)} className="caption text-on-surface-variant hover:text-primary">
                    Télécharger
                  </button>
                  <button onClick={() => supprimerEnregistrement(r)} className="caption text-outline hover:text-error" title="Supprimer">
                    <i className="ph-duotone ph-trash" style={{ fontSize: 14 }} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <p className="caption text-on-surface-variant">
          {DIFFUSION_EN_DEMO ? "Serveur RTMP : bientôt connecté — " : "Serveur RTMP : rtmp://diffusion (OBS) — "}
          clé de stream : <span className="font-mono text-primary">{live.cle_stream}</span>
        </p>
      </div>

      {/* Suppression d'un live passé (terminé ou annulé) */}
      {(live.statut === "termine" || live.statut === "annule") && (
        <button
          onClick={async () => {
            if (!confirm("Supprimer définitivement ce live ? Les messages, cadeaux et slides associés seront également supprimés.")) return;
            const { data: erreur } = await supabase.rpc("supprimer_live", { p_live_id: id });
            if (erreur) {
              setToast(erreur);
              setTimeout(() => setToast(""), 3000);
            } else {
              router.push("/lives");
            }
          }}
          className="mt-3 caption text-outline hover:text-error transition-colors flex items-center gap-1.5"
        >
          <i className="ph-duotone ph-trash" style={{ fontSize: 14 }} aria-hidden="true" />
          Supprimer ce live
        </button>
      )}
    </div>
  );

  // Modules de modération (invitations + slides) — réglages et layout normal
  const moderationModulesJSX = (
    <>
      {peutModerer && live.statut === "en_direct" && (
        <InvitationsAntenne liveId={id} surToast={(t) => { setToast(t); setTimeout(() => setToast(""), 3000); }} />
      )}
      {peutModerer && (
        <SlidesDirect liveId={id} estCreateur={estCreateur || estAdmin} surToast={(t) => { setToast(t); setTimeout(() => setToast(""), 3000); }} />
      )}
    </>
  );

  // Mode cockpit : le créateur/admin en plein écran pendant son direct
  if (enPleinEcran) {
    return (
      <main className="fixed inset-0 z-[60] bg-black flex flex-col select-none">
        {/* Bandeau haut */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 gap-3 border-b border-outline-variant/20 bg-black">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-error text-on-error caption font-bold px-2 py-1 rounded pulse-live shrink-0">● EN DIRECT</span>
            <p className="caption font-bold text-on-surface truncate">{live.titre}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-surface-lowest/70 backdrop-blur-md caption text-on-surface px-2.5 py-1 rounded flex items-center gap-1.5">
              <i className="ph-duotone ph-eye text-primary" style={{ fontSize: 13 }} aria-hidden="true" /> {spectateurs}
            </span>
            <button
              onClick={() => setReglagesOuverts(true)}
              title="Réglages"
              className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              <i className="ph-duotone ph-gear-six" style={{ fontSize: 20 }} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Lecteur plein écran + chat défilant sur le côté */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative overflow-hidden">{lecteurComplet}</div>
<aside className="w-40 sm:w-72 lg:w-96 shrink-0 bg-transparent border-l border-outline-variant/20 flex flex-col">
            <div className="px-3 py-2.5 flex items-center gap-2 shrink-0">
              <i className="ph-duotone ph-chats-circle text-primary" style={{ fontSize: 16 }} aria-hidden="true" />
              <span className="label-md text-on-surface">Chat</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="caption text-primary font-bold">@{m.pseudo || "anonyme"} </span>
                    <span className="body-md text-on-surface-variant">{m.texte}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setTexte(`@${m.pseudo || "anonyme"} `); chatInputRef.current?.focus(); }}
                      title="Répondre"
                      className="caption text-outline hover:text-primary"
                    >
                      <i className="ph-duotone ph-arrow-bend-up-left" style={{ fontSize: 14 }} aria-hidden="true" />
                    </button>
                    {peutModerer && !String(m.id).startsWith("optimiste-") && (
                      <button
                        onClick={() => supprimerMessage(m.id)}
                        title="Supprimer ce message"
                        className="caption text-outline hover:text-error"
                      >
                        <i className="ph-duotone ph-trash" style={{ fontSize: 14 }} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="caption text-on-surface-variant">Aucun message — lancez la conversation !</p>
              )}
            </div>
            <form onSubmit={envoyer} className="shrink-0 p-3 flex gap-2">
              <input
                ref={chatInputRef}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 bg-black/40 border border-outline-variant/30 rounded-lg text-on-surface px-3 py-2.5 outline-none focus:border-outline transition-colors text-sm"
              />
              <button
                type="submit"
                className="bg-primary text-on-primary-fixed rounded-lg px-3 flex items-center justify-center hover:bg-primary-container transition-colors"
              >
                <i className="ph-duotone ph-paper-plane-tilt" style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </form>
          </aside>
        </div>

        {/* Barre de commandes en bas : pause · arrêt · enregistrement */}
        <div className="shrink-0 px-4 pt-3 pb-8 grid grid-cols-3 gap-3 bg-black">
          <button
            onClick={async () => {
              const pause = !live.en_pause;
              await supabase.from("lives").update({ en_pause: pause }).eq("id", id);
              setLive((l) => ({ ...l, en_pause: pause }));
            }}
            className="h-14 rounded-xl bg-surface-container border border-outline-variant text-on-surface label-md flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          >
            <i className={`ph-duotone ${live.en_pause ? "ph-play" : "ph-pause"}`} style={{ fontSize: 18 }} aria-hidden="true" />
            {live.en_pause ? "Reprendre" : "Pause"}
          </button>
          <button
            onClick={async () => {
              if (enregistreEnCours) arreterEnregistrement();
              await supabase
                .from("lives")
                .update({ statut: "termine", termine_a: new Date().toISOString(), en_pause: false })
                .eq("id", id);
              setLive((l) => ({ ...l, statut: "termine" }));
              router.push("/lives");
            }}
            className="h-14 rounded-xl border border-error text-error label-md flex flex-col items-center justify-center gap-0.5 hover:bg-error/10 active:scale-95 transition-transform"
          >
            <i className="ph-duotone ph-stop-circle" style={{ fontSize: 18 }} aria-hidden="true" />
            Arrêter
          </button>
          {sourceLocale ? (
            <button
              onClick={enregistreEnCours ? arreterEnregistrement : demarrerEnregistrement}
              disabled={envoiRec || live.en_pause}
              className={`h-14 rounded-xl label-md flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 active:scale-95 transition-transform ${
                enregistreEnCours ? "border border-error text-error" : "bg-primary text-on-primary-fixed"
              }`}
            >
              <i className={`ph-duotone ${enregistreEnCours ? "ph-stop-circle" : "ph-record"}`} style={{ fontSize: 18 }} aria-hidden="true" />
              {envoiRec
                ? "Sauvegarde..."
                : enregistreEnCours
                  ? `⏹ ${Math.floor(dureeRec / 60)}:${String(dureeRec % 60).padStart(2, "0")}`
                  : "Enregistrer"}
            </button>
          ) : (
            <div className="h-14 rounded-xl border border-outline-variant text-outline caption flex flex-col items-center justify-center gap-0.5">
              <i className="ph-duotone ph-record" style={{ fontSize: 18 }} aria-hidden="true" />
              REC : source MP4
            </div>
          )}
        </div>

        {/* Onglet Réglages : tout l'administratif du direct */}
        {reglagesOuverts && (
          <div className="fixed inset-0 z-[75] bg-background overflow-y-auto p-5 pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="sticky top-0 flex items-center justify-between py-3 bg-background z-10">
                <h2 className="title-lg text-primary flex items-center gap-2">
                  <i className="ph-duotone ph-gear-six" style={{ fontSize: 22 }} aria-hidden="true" /> Réglages
                </h2>
                <button
                  onClick={() => setReglagesOuverts(false)}
                  className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-on-surface hover:text-primary transition-colors"
                >
                  <i className="ph-duotone ph-x" style={{ fontSize: 20 }} aria-hidden="true" />
                </button>
              </div>
              {panneauCreateurJSX}
              {moderationModulesJSX}
            </div>
          </div>
        )}


        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] glass-panel rounded-lg px-6 py-3 label-md text-primary">
            {toast}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="pt-24 pb-10 px-5 md:px-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lecteur + chat */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {lecteurComplet}

          {/* Barre de réactions */}
          <div className="flex items-center gap-2">
            {EMOJIS_REACTION.map((e) => (
              <button
                key={e}
                onClick={() => envoyerReaction(e)}
                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-lg active:scale-95 transition-transform"
              >
                {e}
              </button>
            ))}
            <span className="caption text-on-surface-variant ml-2">
              Réagis en direct — tout le monde voit tes emojis
            </span>
          </div>

          <div>
            <h1 className="headline-md text-on-surface">{live.titre}</h1>
            <p className="body-md text-on-surface-variant mt-1">
              par @{live.profiles?.pseudo || "créateur"} {live.description ? `— ${live.description}` : ""}
            </p>
          </div>

          {(estCreateur || estAdmin) && panneauCreateurJSX}
          {moderationModulesJSX}


          {/* Cadeaux */}
          <div className="bg-surface-low border border-outline-variant rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="label-md text-primary uppercase flex items-center gap-2">
                <i className="ph-duotone ph-gift" style={{ fontSize: 18 }} aria-hidden="true" /> Offrir un cadeau
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
                  disabled={live?.statut !== "en_direct"}
                  title={live?.statut === "en_direct" ? undefined : "Disponible pendant le direct"}
                  className="flex-none flex flex-col items-center gap-1 px-4 py-3 rounded-lg border border-outline-variant/30 hover:border-outline bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="bg-surface-low border border-outline-variant rounded-xl flex flex-col h-[600px]">
            <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2">
              <i className="ph-duotone ph-eye text-primary" style={{ fontSize: 16 }} aria-hidden="true" />
              <span className="label-md text-on-surface">Chat en direct</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2">
                  <div>
                    <span className="caption text-primary font-bold">@{m.pseudo || "anonyme"} </span>
                    <span className="body-md text-on-surface-variant">{m.texte}</span>
                  </div>
                  {peutModerer && !String(m.id).startsWith("optimiste-") && (
                    <button
                      onClick={() => supprimerMessage(m.id)}
                      title="Supprimer ce message"
                      className="caption text-outline hover:text-error shrink-0"
                    >
                      <i className="ph-duotone ph-trash" style={{ fontSize: 14 }} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <p className="caption text-on-surface-variant">Aucun message — lancez la conversation !</p>
              )}
            </div>
            {live?.statut === "en_direct" ? (
              <form onSubmit={envoyer} className="p-3 border-t border-outline-variant/20 flex gap-2">
                <input
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder="Votre message..."
                  className="flex-1 bg-surface-low border border-outline-variant rounded-lg text-on-surface px-3 py-2.5 outline-none focus:border-outline transition-colors"
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary-fixed rounded-lg px-3 flex items-center justify-center hover:bg-primary-container transition-colors"
                >
                  <i className="ph-duotone ph-paper-plane-tilt" style={{ fontSize: 18 }} aria-hidden="true" />
                </button>
              </form>
            ) : (
              <div className="p-3 border-t border-outline-variant/20">
                <p className="caption text-on-surface-variant text-center">
                  {live?.statut === "programme"
                    ? "Le chat ouvre quand le direct démarre."
                    : "Ce direct est terminé."}
                </p>
              </div>
            )}
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
