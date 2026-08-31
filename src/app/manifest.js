export default function manifest() {
  return {
    name: "TiVoi — Streaming Premium",
    short_name: "TiVoi",
    description:
      "Films, séries, chaînes TV et lives — la plateforme de streaming de Côte d'Ivoire.",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#131313",
    theme_color: "#131313",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
