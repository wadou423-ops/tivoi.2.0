"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, FileText, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import LoaderCentered from "../../../components/LoaderCentered";
import Spinner from "../../../components/Spinner";

const FOURNISSEURS = [
  { code: "wave", nom: "Wave", emoji: "🌊" },
  { code: "orange", nom: "Orange Money", emoji: "🟠" },
  { code: "mtn", nom: "MTN MoMo", emoji: "🟡" },
  { code: "moov", nom: "Moov Money", emoji: "🔵" },
  { code: "carte", nom: "Visa / Mastercard", emoji: "💳" },
  { code: "paypal", nom: "PayPal", emoji: "🅿️" },
];

function genererReference() {
  const suffixe = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TVO-${Date.now()}-${suffixe}`;
}

export default function Paiement() {
  const { type, id } = useParams();
  const router = useRouter();
  const [objet, setObjet] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [fournisseur, setFournisseur] = useState("wave");
  const [telephone, setTelephone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function load() {
      if (type === "achat") {
        const { data } = await supabase.from("catalogue").select("id, titre, image_url, prix_fcfa").eq("id", id).single();
        setObjet(data ? { ...data, montant: data.prix_fcfa || 0, libelle: data.titre, detail: "Location — accès permanent" } : null);
      } else if (type === "abo") {
        const { data } = await supabase.from("abonnements_paliers").select("code, nom, prix_fcfa, avantages").eq("code", id).single();
        setObjet(data ? { ...data, montant: data.prix_fcfa, libelle: `Abonnement ${data.nom}`, detail: "1 mois — accès selon palier" } : null);
      } else if (type === "tokens") {
        const { data } = await supabase.from("packs_tokens").select("id, nom, tokens, prix_fcfa").eq("id", id).single();
        setObjet(data ? { ...data, montant: data.prix_fcfa, libelle: data.nom, detail: `${data.tokens} jetons` } : null);
      }
      setChargement(false);
    }
    load();
  }, [type, id]);

  async function payer() {
    setErreur("");
    setProcessing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProcessing(false);
      return router.push("/connexion");
    }
    if (fournisseur !== "carte" && fournisseur !== "paypal" && telephone.trim().length < 8) {
      setErreur("Saisissez votre numéro de téléphone Mobile Money.");
      setProcessing(false);
      return;
    }

    const reference = genererReference();

    const { data: paiement, error } = await supabase
      .from("paiements")
      .insert({
        user_id: user.id,
        fournisseur,
        montant_fcfa: objet.montant,
        reference,
        objet_type: type === "achat" ? "achat" : type === "abo" ? "abonnement" : "tokens",
        objet_id: String(id),
      })
      .select("reference")
      .single();

    if (error) {
      setErreur(`Erreur : ${error.message}`);
      setProcessing(false);
      return;
    }

    // --- Wave réel (si la fonction Edge est configurée) ---
    if (fournisseur === "wave") {
      try {
        const { data: session } = await supabase.functions.invoke("wave-checkout", {
          body: {
            amount: total,
            reference,
            success_url: `${window.location.origin}/confirmation/${reference}`,
            error_url: `${window.location.origin}/paiement/${type}/${id}`,
          },
        });

        if (session?.wave_launch_url) {
          window.location.assign(session.wave_launch_url);
          return; // la confirmation arrivera par le webhook
        }
        // Pas configuré (501) → on retombe sur la simulation ci-dessous
      } catch {
        /* fallback simulation */
      }
    }

    // --- Simulation de la confirmation du fournisseur (mode démo) ---
    setTimeout(async () => {
      await supabase.rpc("confirmer_paiement", { p_reference: paiement.reference });
      router.push(`/confirmation/${paiement.reference}`);
    }, 3000);
  }

  if (chargement) {
    return <LoaderCentered />;
  }

  if (!objet) {
    return (
      <main className="pt-32 pb-20 px-5 md:px-20 text-center">
        <p className="text-on-surface-variant">Objet de paiement introuvable.</p>
        <Link href="/" className="text-primary hover:text-primary-container">Retour à l&apos;accueil</Link>
      </main>
    );
  }

  const taxes = Math.round(objet.montant * 0.18);
  const total = objet.montant + taxes;

  return (
    <main className="flex-grow flex items-center justify-center py-12 px-5 md:px-20 pt-28">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : méthodes */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Link href="-1" onClick={(e) => { e.preventDefault(); history.back(); }} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors w-fit">
            <ArrowLeft size={18} /> Retour
          </Link>

          <div>
            <h1 className="display-lg text-on-surface">Paiement</h1>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FOURNISSEURS.map((f) => (
              <button
                key={f.code}
                onClick={() => setFournisseur(f.code)}
                className={`h-28 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                  fournisseur === f.code
                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    : "border-outline-variant/30 bg-surface-container hover:border-primary/50"
                }`}
              >
                <span className="text-3xl">{f.emoji}</span>
                <span className={`label-md ${fournisseur === f.code ? "text-primary" : "text-on-surface-variant"}`}>
                  {f.nom}
                </span>
              </button>
            ))}
          </div>

          {(fournisseur !== "carte" && fournisseur !== "paypal") && (
            <div className="glass-panel glow-focus rounded-xl p-5">
              <label className="label-md text-on-surface mb-2 block">Numéro Mobile Money</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="07 XX XX XX XX"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
              <p className="caption text-on-surface-variant mt-2 opacity-70">
                Un code de confirmation vous sera envoyé par le fournisseur. (Mode démo : validation automatique)
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite : récapitulatif */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="glass-panel rounded-xl p-6 flex flex-col h-full">
            <h2 className="title-lg text-primary mb-6 flex items-center gap-2">
              <FileText size={20} /> Récapitulatif
            </h2>

            <div className="flex gap-4 items-start pb-4 border-b border-outline-variant/20">
              {type === "achat" && objet.image_url && (
                <div
                  className="w-16 h-24 bg-cover bg-center rounded bg-surface-container shrink-0 border border-outline-variant/30"
                  style={{ backgroundImage: `url('${objet.image_url}')` }}
                />
              )}
              <div className="flex flex-col">
                <span className="label-md text-on-surface">{objet.libelle}</span>
                <span className="caption text-on-surface-variant mt-1">{objet.detail}</span>
                <span className="title-lg text-primary mt-2">{objet.montant.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex justify-between body-md text-on-surface-variant">
                <span>Sous-total</span>
                <span>{objet.montant.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between body-md text-on-surface-variant">
                <span>Taxes (18%)</span>
                <span>{taxes.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between title-lg text-on-surface pt-4 border-t border-outline-variant/20">
                <span>Total</span>
                <span className="text-primary">{total.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <button
              onClick={payer}
              disabled={processing}
              className="w-full bg-primary-container text-on-primary label-md py-4 rounded-lg mt-8 hover:bg-primary transition-colors duration-200 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50"
            >
              <Lock size={16} />
              {processing
                ? "Traitement en cours..."
                : "Payer maintenant"}
              {processing && <Spinner size={16} />}
            </button>
            {erreur && <p className="caption text-error mt-3 text-center">{erreur}</p>}
            <p className="caption text-on-surface-variant text-center mt-4 opacity-70">
              Paiement sécurisé crypté de bout en bout.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
