export default function Home() {
  const ticker = [
    "🎬 À la une : Le Trône d'Abidjan",
    "🔴 EN DIRECT — Konan Live",
    "📺 France 24",
    "🎬 Nouveau : Sarabah",
    "🔴 EN DIRECT — Soirée Zouglou",
    "📺 Al Jazeera English",
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6">
        <span className="font-display text-3xl tracking-wide text-[#E8A33D]">
          TiVoi
        </span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-[#C7CCD6]">
          <a href="#" className="hover:text-[#F4F1EA] transition">Catalogue</a>
          <a href="#" className="hover:text-[#F4F1EA] transition">Lives</a>
          <a href="#" className="hover:text-[#F4F1EA] transition">Chaînes TV</a>
        </nav>
        <button className="rounded-full border border-[#E8A33D] px-5 py-2 text-sm text-[#E8A33D] hover:bg-[#E8A33D] hover:text-[#0B0E14] transition">
          Connexion
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-12 max-w-3xl">
        <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-[#F4F1EA]">
          Films, lives et chaînes TV.<br />
          <span className="text-[#E8A33D]">Un seul écran.</span>
        </h1>
        <p className="mt-6 text-lg text-[#9AA0AC] max-w-xl">
          La plateforme de streaming pensée pour la Côte d&apos;Ivoire — séries et
          films à la demande, lives de créateurs et chaînes en direct, réunis
          au même endroit.
        </p>
        <div className="mt-8 flex gap-4">
          <button className="rounded-full bg-[#E8A33D] px-6 py-3 text-sm font-semibold text-[#0B0E14] hover:brightness-110 transition">
            Créer un compte
          </button>
          <button className="rounded-full border border-[#2A2E38] px-6 py-3 text-sm text-[#F4F1EA] hover:border-[#E8A33D] transition">
            Voir le catalogue
          </button>
        </div>
      </section>

      {/* Ticker style guide TV */}
      <div className="border-y border-[#1C2029] overflow-hidden py-3 bg-[#0F131B]">
        <div className="flex whitespace-nowrap ticker-track">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-[#9AA0AC]">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 grid gap-10 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#E8A33D]">Catalogue</p>
          <h2 className="font-display text-2xl mt-2 text-[#F4F1EA]">Films & séries</h2>
          <p className="mt-3 text-sm text-[#9AA0AC]">
            Paiement à la séance ou abonnement — accès immédiat, sans détour.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#E8A33D]">Communauté</p>
          <h2 className="font-display text-2xl mt-2 text-[#F4F1EA]">Lives de créateurs</h2>
          <p className="mt-3 text-sm text-[#9AA0AC]">
            Chat en direct, cadeaux virtuels, et des créateurs à soutenir en temps réel.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#E8A33D]">En continu</p>
          <h2 className="font-display text-2xl mt-2 text-[#F4F1EA]">Chaînes TV</h2>
          <p className="mt-3 text-sm text-[#9AA0AC]">
            France 24, Al Jazeera et bien d&apos;autres, diffusées en direct 24h/24.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-[#1C2029] text-xs text-[#5C6270]">
        © {new Date().getFullYear()} TiVoi — Tous droits réservés.
      </footer>
    </main>
  );
}