export default function AdminHome() {
  return (
    <main className="px-6 md:px-12 py-12">
      <h1 className="font-display text-3xl text-[#E8A33D] mb-2">Tableau de bord</h1>
      <p className="text-sm text-[#9AA0AC] mb-8">Vue d&apos;ensemble de TiVoi.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <a href="/admin/utilisateurs" className="block bg-[#0F131B] border border-[#1C2029] rounded-2xl p-6 hover:border-[#E8A33D] transition">
          <h2 className="font-display text-lg text-[#F4F1EA]">Utilisateurs</h2>
          <p className="text-sm text-[#9AA0AC] mt-2">Gérer les comptes et les rôles.</p>
        </a>
        <a href="/admin/vtc" className="block bg-[#0F131B] border border-[#1C2029] rounded-2xl p-6 hover:border-[#E8A33D] transition">
          <h2 className="font-display text-lg text-[#F4F1EA]">Playlist VTC</h2>
          <p className="text-sm text-[#9AA0AC] mt-2">Gérer le contenu et les publicités.</p>
        </a>
        <div className="block bg-[#0F131B] border border-[#1C2029] rounded-2xl p-6 opacity-50">
          <h2 className="font-display text-lg text-[#F4F1EA]">Catalogue</h2>
          <p className="text-sm text-[#9AA0AC] mt-2">Bientôt disponible.</p>
        </div>
      </div>
    </main>
  );
}