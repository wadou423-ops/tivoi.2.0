export const metadata = {
  title: "Mentions légales — TiVoi",
};

const SECTIONS = [
  {
    titre: "1. Éditeur",
    contenu:
      "TiVoi est une plateforme de streaming premium opérée en Côte d'Ivoire. Contact : contact@tivoi.ci. Directeur de la publication : l'équipe TiVoi.",
  },
  {
    titre: "2. Hébergement",
    contenu:
      "Le site est hébergé par Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, États-Unis) avec base de données Supabase Inc. Les données sont chiffrées en transit (TLS).",
  },
  {
    titre: "3. Données personnelles (loi n°2013-450)",
    contenu:
      "TiVoi collecte uniquement les données nécessaires au fonctionnement du service : email, pseudonyme, historique d'achats et de visionnage. Conformément à la loi ivoirienne n°2013-450 relative à la protection des données à caractère personnel, vous disposez d'un droit d'accès, de rectification et de suppression de vos données en nous contactant. Aucune donnée bancaire n'est stockée sur nos serveurs : les paiements transitent par les fournisseurs (Mobile Money, Stripe, PayPal).",
  },
  {
    titre: "4. Utilisateurs européens (RGPD)",
    contenu:
      "Pour les utilisateurs résidant dans l'UE, le traitement des données est régi par le RGPD. Base légale : exécution du contrat (art. 6.1.b). Durée de conservation : durée du compte + 3 ans. Vous pouvez exercer vos droits (accès, rectification, effacement, portabilité) par email.",
  },
  {
    titre: "5. Propriété intellectuelle",
    contenu:
      "L'ensemble des contenus (films, séries, lives, chaînes) est protégé par le droit d'auteur. Toute reproduction non autorisée est interdite. Les marques citées appartiennent à leurs propriétaires respectifs.",
  },
  {
    titre: "6. Conditions d'utilisation",
    contenu:
      "Le service est réservé aux personnes majeures ou avec accord parental. L'achat d'un contenu donne un droit d'accès personnel, non transférable. Les jetons acquis ne sont ni échangeables ni remboursables. Tout abus (fraude, propos haineux, spam) entraîne la suspension du compte.",
  },
  {
    titre: "7. Caméras embarquées VTC",
    contenu:
      "Dans les véhicules équipés d'écrans TiVoi, le ciblage publicitaire utilise uniquement des estimations démographiques anonymes calculées localement sur l'appareil. Aucune image n'est transmise ni conservée. Un affichage visible informe les passagers du traitement, conformément aux exigences de l'autorité ivoirienne de protection des données (ARTCI).",
  },
];

export default function PagesLegales() {
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20 max-w-3xl mx-auto w-full">
      <h1 className="display-lg text-on-surface mb-10">Mentions légales & confidentialité</h1>
      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.titre} className="glass-panel rounded-xl p-6">
            <h2 className="title-lg text-primary mb-3">{s.titre}</h2>
            <p className="body-md text-on-surface-variant leading-relaxed">{s.contenu}</p>
          </section>
        ))}
      </div>
      <p className="caption text-outline mt-10 text-center">
        Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
      </p>
    </main>
  );
}
