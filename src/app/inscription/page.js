"use client";

import { useState } from "react";
import { Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Inscription() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom, prenom } },
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.");
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-73px)] flex items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 -z-10">
        <div
          className="w-full h-full bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAlqFn-sW_T2tzf2DMkA1ID0OorjDeqzm2SXbLiQZ8FeSzLWsSIOiR7L6W3anilp9EaiN2Ip15COOESIb5itzFEUqkZiEQu048LEiJ1bhPU9VlFdENE8V7S_9T5sCcJ7rwg4F6V293vfjb5lRHVG2Kt0fd48_MWPStnrKQLMSHCSmVAZvXxtGv5ig--Dy7tlN8q3Z4go9uj9ysydpjMTBRSWt9bvCG9nP7HU03SvSOtILC-DvazlNTS')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131313] via-transparent to-[#131313]" />
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md p-8 rounded-xl bg-[#1C1B1B]/80 border border-[#4D4635]/20 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl text-[#F2CA50] tracking-tight mb-3">TiVoi</h1>
          <p className="font-narrow text-[#D0C5AF]">Rejoignez l&apos;expérience cinéma premium.</p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D0C5AF]" />
              <input type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="w-full bg-[#353534]/50 border-0 border-b-2 border-[#4D4635] text-[#E5E2E1] pl-9 pr-3 py-3 outline-none focus:border-[#D4AF37] focus:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all" />
            </div>
            <input type="text" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="w-full bg-[#353534]/50 border-0 border-b-2 border-[#4D4635] text-[#E5E2E1] px-3 py-3 outline-none focus:border-[#D4AF37] focus:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all" />
          </div>

          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D0C5AF]" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#353534]/50 border-0 border-b-2 border-[#4D4635] text-[#E5E2E1] pl-10 pr-4 py-3 outline-none focus:border-[#D4AF37] focus:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all" />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D0C5AF]" />
            <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-[#353534]/50 border-0 border-b-2 border-[#4D4635] text-[#E5E2E1] pl-10 pr-10 py-3 outline-none focus:border-[#D4AF37] focus:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all" />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D0C5AF] hover:text-[#F2CA50] transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-[#3C2F00] font-heading text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-50">
            {loading ? "Création..." : "S'inscrire"}
          </button>

          {message && <p className="text-sm text-center text-[#D0C5AF] font-narrow">{message}</p>}
        </div>

        <div className="mt-8 text-center border-t border-[#4D4635]/20 pt-6">
          <p className="font-narrow text-sm text-[#D0C5AF]">
            Déjà membre ?{" "}
            <a href="/connexion" className="text-[#F2CA50] font-bold hover:text-[#D4AF37] transition-colors">Se connecter</a>
          </p>
        </div>
      </form>
    </main>
  );
}