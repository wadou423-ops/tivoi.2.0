"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "../components/Spinner";

export default function Connexion() {
  return (
    <Suspense fallback={null}>
      <ConnexionContent />
    </Suspense>
  );
}

function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("email"); // email | telephone

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [telephone, setTelephone] = useState("");
  const [etapeOtp, setEtapeOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(true);

  // Filet de sécurité : si la vérification de session bloque, afficher le formulaire
  useEffect(() => {
    const t = setTimeout(() => {
      setVerification((v) => {
        if (v) setMessage("Connexion au serveur lente — réessaie de te connecter ci-dessous.");
        return false;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  // Déjà connecté ? Si client → redirection directe. Si admin → message (sans déconnexion forcée)
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role, pseudo")
          .eq("id", user.id)
          .single();
        if (p?.role === "admin") {
          setVerification(false);
          setMessage(
            "Une session administrateur est active dans ce navigateur. Le portail admin et le site client partagent la même session — utilisez http://127.0.0.1:3000/connexion pour vous connecter en client en parallèle."
          );
          return;
        }
        // Compte connecté sans pseudo → le compléter d'abord
        if (!p?.pseudo) {
          router.replace("/choisir-pseudo");
          return;
        }
        router.replace(searchParams.get("redirect") || "/");
        return;
      }
      setVerification(false);
    }
    check();
  }, [router, searchParams]);

  function terminerConnexion(profile) {
    const destination = searchParams.get("redirect") || "/";
    if (!profile?.pseudo) {
      router.push("/choisir-pseudo");
    } else {
      router.push(destination);
    }
    router.refresh();
  }

  async function handleEmail(e) {
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
      .select("role, pseudo")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    // Un compte admin ne peut pas se connecter sur le site client
    if (profile?.role === "admin") {
      setMessage(
        "Ce compte est un compte administrateur — la connexion côté client a été refusée. Utilisez le portail administrateur, ou créez un compte client séparé."
      );
      return;
    }

    // Compte sans pseudo → compléter le profil d'abord
    if (!profile?.pseudo) {
      router.push("/choisir-pseudo");
      return;
    }

    terminerConnexion(profile);
  }

  async function demanderOtp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const numero = `+225${telephone}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: numero });

    if (error) {
      setLoading(false);
      if (
        error.message.toLowerCase().includes("sms") ||
        error.message.toLowerCase().includes("provider") ||
        error.status === 500
      ) {
        setMessage(
          "L'envoi de SMS n'est pas encore activé sur la plateforme. Utilisez la connexion par email pour le moment."
        );
      } else {
        setMessage(`Erreur : ${error.message}`);
      }
      return;
    }

    setLoading(false);
    setEtapeOtp(true);
    setMessage("Code envoyé par SMS au +225 " + telephone);
  }

  async function verifierOtp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      phone: `+225${telephone}`,
      token: otp,
      type: "sms",
    });

    if (error) {
      setLoading(false);
      setMessage("Code invalide ou expiré. Réessayez.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, pseudo")
      .eq("id", user.id)
      .single();

    setLoading(false);

    // Un compte admin ne peut pas se connecter sur le site client
    if (profile?.role === "admin") {
      setMessage(
        "Ce compte est un compte administrateur — la connexion côté client a été refusée. Utilisez le portail administrateur, ou créez un compte client séparé."
      );
      return;
    }

    // Compte sans pseudo → compléter le profil d'abord
    if (!profile?.pseudo) {
      router.push("/choisir-pseudo");
      return;
    }

    terminerConnexion(profile);
  }

  if (verification) {
    return (
      <main className="relative min-h-[calc(100vh-73px)] flex items-center justify-center">
        <Spinner size={36} />
      </main>
    );
  }

  const inputClass =
    "w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface py-3 outline-none focus:border-primary-container transition-colors";

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
        onSubmit={etapeOtp ? verifierOtp : mode === "email" ? handleEmail : demanderOtp}
        className="relative z-10 w-full max-w-md p-8 rounded-xl glass-panel glow-focus shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />

        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-4xl text-primary tracking-tight mb-3">TiVoi</h1>
          <p className="text-on-surface-variant">Connectez-vous pour découvrir le meilleur du cinéma.</p>
        </div>

        {/* Onglets Email / Téléphone */}
        {!etapeOtp && (
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-lg bg-surface-variant/50">
            <button
              type="button"
              onClick={() => { setMode("email"); setMessage(""); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-title font-semibold transition-all ${
                mode === "email" ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Mail size={15} /> Email
            </button>
            <button
              type="button"
              onClick={() => { setMode("telephone"); setMessage(""); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-title font-semibold transition-all ${
                mode === "telephone" ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Phone size={15} /> Téléphone
            </button>
          </div>
        )}

        {/* --- ÉTAPE OTP : saisie du code reçu --- */}
        {etapeOtp ? (
          <div className="space-y-5">
            <div className="text-center">
              <p className="body-md text-on-surface-variant mb-4">
                Saisissez le code à 6 chiffres reçu par SMS
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className={`${inputClass} text-center font-mono text-3xl tracking-[0.6em] pl-3`}
            />
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size={16} />}
              {loading ? "Vérification..." : "Valider le code"}
            </button>
            <button
              type="button"
              onClick={() => { setEtapeOtp(false); setOtp(""); setMessage(""); }}
              className="w-full flex items-center justify-center gap-2 caption text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowLeft size={13} /> Changer de numéro
            </button>
          </div>
        ) : mode === "email" ? (
          /* --- CONNEXION EMAIL --- */
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="font-title font-semibold text-sm text-on-surface mb-2 block">Email</label>
              <div className="relative rounded-lg glow-focus transition-all">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className={inputClass + " pl-10 pr-4"}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="font-title font-semibold text-sm text-on-surface mb-2 block">Mot de passe</label>
              <div className="relative rounded-lg glow-focus transition-all">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + " pl-10 pr-10"}
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
              <a href="/mot-de-passe-oublie" className="text-xs text-primary hover:text-primary-container transition-colors">
                Mot de passe oublié ?
              </a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size={16} />}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        ) : (
          /* --- CONNEXION TÉLÉPHONE (OTP) --- */
          <div className="space-y-5">
            <div>
              <label htmlFor="tel" className="font-title font-semibold text-sm text-on-surface mb-2 block">
                Numéro de téléphone
              </label>
              <div className="relative rounded-lg glow-focus transition-all">
                <Phone size={18} className="absolute left-3 top-[calc(50%-7px)] -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <span className="absolute left-10 top-[calc(50%-9px)] -translate-y-1/2 text-on-surface-variant text-sm font-semibold pointer-events-none pr-2 border-r border-outline-variant h-6 flex items-center justify-center">
                  +225
                </span>
                <input
                  id="tel"
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="07 00 00 00 00"
                  inputMode="numeric"
                  className={inputClass + " pl-[76px] pr-4 text-center"}
                />
              </div>
              <p className="caption text-on-surface-variant mt-2 opacity-70">
                Vous recevrez un code par SMS, sans mot de passe.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || telephone.length < 8}
              className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size={16} />}
              {loading ? "Envoi du code..." : "Recevoir mon code"}
            </button>
          </div>
        )}

        {message && (
          <p className={`text-sm text-center mt-5 ${etapeOtp ? "text-primary" : "text-on-surface-variant"}`}>
            {message}
          </p>
        )}

        <div className="mt-6 text-center border-t border-outline-variant/20 pt-6">
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
