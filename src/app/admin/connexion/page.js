"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "../../components/Spinner";

export default function ConnexionAdmin() {
  return (
    <Suspense fallback={null}>
      <ConnexionAdminContent />
    </Suspense>
  );
}

function ConnexionAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("refuse") ? "Ce portail est réservé aux comptes administrateurs." : "");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(true);

  // Déjà connecté en admin ? → dashboard direct
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          router.replace("/admin");
          return;
        }
      }
      setVerification(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage("Identifiants incorrects.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      // Compte valide mais pas admin : on refuse l'accès au portail
      await supabase.auth.signOut();
      setLoading(false);
      setMessage("Ce portail est réservé aux comptes administrateurs.");
      return;
    }

    setLoading(false);
    router.push("/admin");
  }

  if (verification) {
    return (
      <main className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <Spinner size={36} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-lowest flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="display-lg text-primary tracking-tighter !text-3xl !leading-none mb-2">TiVoi</p>
          <p className="label-md text-on-surface-variant uppercase tracking-widest">Portail administrateur</p>
        </div>

        {message && (
          <div className="glass-panel rounded-lg p-4 mb-5 flex items-center gap-3">
            <ShieldAlert size={18} className="text-error shrink-0" />
            <p className="caption text-on-surface-variant">{message}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="glass-panel glow-focus rounded-xl p-8 flex flex-col gap-5"
        >
          <div>
            <label htmlFor="admin-email" className="label-md text-on-surface mb-2 block">
              Email administrateur
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tivoi.ci"
              className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface px-4 py-3 outline-none focus:border-primary-container transition-colors"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="label-md text-on-surface mb-2 block">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant rounded-lg text-on-surface pl-9 pr-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary label-md py-4 rounded-lg hover:bg-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={16} />}
            {loading ? "Vérification..." : "Accéder au dashboard"}
          </button>
        </form>

        <p className="text-center caption text-outline mt-6">
          Accès strictement réservé à l&apos;équipe TiVoi.
        </p>
      </div>
    </main>
  );
}
