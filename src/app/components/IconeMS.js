"use client";

// Icône Material Symbols — le jeu d'icônes des maquettes TiVoi
// <IconeMS nom="movie" rempli taille={24} couleur="text-primary" />
export default function IconeMS({ nom, rempli = true, taille = 24, className = "" }) {
  return (
    <span
      className={`material-icon ${className}`}
      style={{
        fontSize: taille,
        fontVariationSettings: `'FILL' ${rempli ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden="true"
    >
      {nom}
    </span>
  );
}
