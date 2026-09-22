// Configuration du serveur de diffusion (MediaMTX) — à renseigner quand le
// VPS sera provisionné : NEXT_PUBLIC_SERVEUR_DIFFUSION_HTTP=https://diffusion.tivoi.ci:8888
// Tant que la variable n'est pas définie, la diffusion caméra reste en mode démo.
export const SERVEUR_DIFFUSION_HTTP =
  process.env.NEXT_PUBLIC_SERVEUR_DIFFUSION_HTTP || "";

export const DIFFUSION_EN_DEMO = !SERVEUR_DIFFUSION_HTTP;

// URL HLS d'un live : le chemin correspond à l'identifiant du live,
// la clé de stream n'apparaît donc jamais dans les URLs des spectateurs.
export function urlHlsDuLive(liveId) {
  return `${SERVEUR_DIFFUSION_HTTP}/live/${liveId}/index.m3u8`;
}