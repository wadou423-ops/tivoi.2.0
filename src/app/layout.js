import { Bebas_Neue, Sora } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-body",
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
        className={`${bebasNeue.variable} ${sora.variable} antialiased bg-[#0B0E14] text-[#F4F1EA]`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}