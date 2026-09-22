import SkeletonGrille from "./SkeletonGrille";

// Squelette d'écran : remplace les spinners plein écran par une silhouette
// assortie à la page, pour un chargement perçu comme instantané.
// variantes : "grille" (cartes films), "blocs" (KPI/menu), "panneau" (formulaire),
// "hero" (accueil) — défaut : panneau.
export default function SquelettePage({ variant = "panneau" }) {
  return (
    <main className="flex-grow pt-28 pb-20 px-5 md:px-20">
      <div className="h-10 w-72 rounded-lg skeleton mb-10" />
      {variant === "grille" && <SkeletonGrille nombre={12} />}
      {variant === "hero" && (
        <div className="flex flex-col gap-8">
          <div className="h-[300px] md:h-[420px] rounded-xl skeleton" />
          <SkeletonGrille nombre={6} />
          <SkeletonGrille nombre={6} />
        </div>
      )}
      {variant === "blocs" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
              <div className="w-8 h-8 rounded-lg skeleton mb-4" />
              <div className="h-8 w-24 rounded skeleton mb-2" />
              <div className="h-3 w-20 rounded skeleton" />
            </div>
          ))}
        </div>
      )}
      {variant !== "grille" && variant !== "hero" && variant !== "blocs" && (
        <div className="bg-surface-low border border-outline-variant rounded-xl p-8 max-w-2xl">
          <div className="h-4 w-40 rounded skeleton mb-5" />
          <div className="h-4 w-full rounded skeleton mb-3" />
          <div className="h-4 w-2/3 rounded skeleton mb-8" />
          <div className="h-11 w-44 rounded-lg skeleton" />
        </div>
      )}
    </main>
  );
}