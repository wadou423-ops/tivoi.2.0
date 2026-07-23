import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const spaceGrotesk = Space_Grotesk({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  weight: ["400", "600"],
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
        className={`${spaceGrotesk.variable} ${manrope.variable} antialiased bg-[#0B0E14] text-[#F4F1EA]`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}