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
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md p-8 rounded-xl glass-panel glow-focus shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />

        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-4xl text-primary tracking-tight mb-3">TiVoi</h1>
          <p className="text-on-surface-variant">Rejoignez l&apos;expérience cinéma premium.</p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative rounded-lg glow-focus transition-all">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface pl-9 pr-3 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom"
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-3 py-3 outline-none focus:border-primary-container transition-colors"
            />
          </div>

          <div className="relative rounded-lg glow-focus transition-all">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface pl-10 pr-4 py-3 outline-none focus:border-primary-container transition-colors"
            />
          </div>

          <div className="relative rounded-lg glow-focus transition-all">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface pl-10 pr-10 py-3 outline-none focus:border-primary-container transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-50"
          >
            {loading ? "Création..." : "S'inscrire"}
          </button>

          {message && <p className="text-sm text-center text-on-surface-variant">{message}</p>}
        </div>

        <div className="mt-8 text-center border-t border-outline-variant/20 pt-6">
          <p className="text-sm text-on-surface-variant">
            Déjà membre ?{" "}
            <a href="/connexion" className="text-primary font-bold hover:text-primary-container transition-colors">
              Se connecter
            </a>
          </p>
        </div>
      </form>
    </main>
  );
}
