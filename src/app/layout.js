import { Montserrat, Archivo_Narrow } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const montserrat = Montserrat({
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const archivoNarrow = Archivo_Narrow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo-narrow",
});

export const metadata = {
  title: "TiVoi — Films, séries, chaînes TV et lives",
  description:
    "La plateforme de streaming pensée pour la Côte d'Ivoire et l'Afrique de l'Ouest.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        className={`${montserrat.variable} ${archivoNarrow.variable} antialiased bg-background text-on-surface font-body`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
