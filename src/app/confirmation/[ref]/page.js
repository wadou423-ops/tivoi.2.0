"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Confirmation() {
  const { ref } = useParams();
  const router = useRouter();
  const [paiement, setPaiement] = useState(null);
  const [essais, setEssais] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("paiements")
        .select("reference, montant_fcfa, statut, objet_type, objet_id, fournisseur")
        .eq("reference", ref)
        .maybeSingle();
      setPaiement(data);
      setEssais((e) => e + 1);
    }
    load();
  }, [ref]);

  // Poll pendant la simulation webhook (max 15s)
  useEffect(() => {
    if (!paiement || paiement.statut !== "en_attente" || essais > 12) return;
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);

    async function load() {
      const { data } = await supabase
        .from("paiements")
        .select("reference, montant_fcfa, statut, objet_type, objet_id, fournisseur")
        .eq("reference", ref)
        .maybeSingle();
      setPaiement(data);
      setEssais((e) => e + 1);
    }
  }, [paiement, essais, ref]);

  if (!paiement) {
    return (
      <main className="pt-32 pb-20 px-5 md:px-20 text-center">
        <p className="text-on-surface-variant">Paiement introuvable.</p>
        <Link href="/" className="text-primary">Retour à l&apos;accueil</Link>
      </main>
    );
  }

  const confirme = paiement.statut === "confirme";
  const echoue = paiement.statut === "echoue";

  async function retour() {
    if (paiement.objet_type === "achat") {
      router.push(`/catalogue/${paiement.objet_id}`);
    } else if (paiement.objet_type === "abonnement") {
      router.push("/abonnements");
    } else {
      router.push("/portefeuille");
    }
  }

  return (
    <main className="flex-grow flex items-center justify-center py-16 px-5 md:px-20 pt-28">
      <div className="glass-panel rounded-xl p-10 max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          {confirme ? (
            <CheckCircle2 size={72} className="text-primary" />
          ) : echoue ? (
            <XCircle size={72} className="text-error" />
          ) : (
            <Loader2 size={72} className="text-primary animate-spin" />
          )}
        </div>

        <h1 className="display-lg text-on-surface mb-3">
          {confirme ? "Paiement confirmé !" : echoue ? "Paiement échoué" : "Traitement..."}
        </h1>
        <p className="body-lg text-on-surface-variant mb-8">
          {confirme
            ? "Votre paiement a été validé. Un email de confirmation vous a été envoyé."
            : echoue
              ? "Une erreur est survenue lors du paiement. Veuillez réessayer."
              : "Nous attendons la confirmation du fournisseur de paiement (quelques secondes en mode démo)."}
        </p>

        <div className="glass-panel rounded-lg p-5 text-left mb-8 space-y-3">
          <div className="flex justify-between body-md">
            <span className="text-on-surface-variant">Référence</span>
            <span className="text-on-surface font-mono text-sm">{paiement.reference}</span>
          </div>
          <div className="flex justify-between body-md">
            <span className="text-on-surface-variant">Montant</span>
            <span className="text-primary font-semibold">{paiement.montant_fcfa.toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between body-md">
            <span className="text-on-surface-variant">Fournisseur</span>
            <span className="text-on-surface capitalize">{paiement.fournisseur}</span>
          </div>
          <div className="flex justify-between body-md">
            <span className="text-on-surface-variant">Statut</span>
            <span className={confirme ? "text-primary" : "text-on-surface-variant"}>{paiement.statut}</span>
          </div>
        </div>

        <button
          onClick={retour}
          className="w-full bg-primary-container text-on-primary label-md py-4 rounded-lg hover:bg-primary transition-colors"
        >
          {paiement.objet_type === "achat"
            ? "Voir mon contenu"
            : paiement.objet_type === "abonnement"
              ? "Voir mon abonnement"
              : "Voir mon portefeuille"}
        </button>
        <Link href="/" className="block mt-4 caption text-on-surface-variant hover:text-primary transition-colors">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
