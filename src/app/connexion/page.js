"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (!profile?.pseudo) {
      router.push("/choisir-pseudo");
    } else {
      router.push("/");
    }
    router.refresh();
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
          <p className="text-on-surface-variant">
            Connectez-vous pour découvrir le meilleur du cinéma.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="font-title font-semibold text-sm text-on-surface mb-2 block">
              Email
            </label>
            <div className="relative rounded-lg glow-focus transition-all">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface pl-10 pr-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="font-title font-semibold text-sm text-on-surface mb-2 block">
              Mot de passe
            </label>
            <div className="relative rounded-lg glow-focus transition-all">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-xs text-primary hover:text-primary-container transition-colors">
              Mot de passe oublié ?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          {message && <p className="text-sm text-center text-on-surface-variant">{message}</p>}
        </div>

        <div className="mt-8 text-center border-t border-outline-variant/20 pt-6">
          <p className="text-sm text-on-surface-variant">
            Nouveau sur TiVoi ?{" "}
            <a href="/inscription" className="text-primary font-bold hover:text-primary-container transition-colors">
              Créer un compte
            </a>
          </p>
        </div>
      </form>
    </main>
  );
}
