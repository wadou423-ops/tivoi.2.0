"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "../components/Spinner";
import LoaderCentered from "../components/LoaderCentered";

export default function ChoisirPseudo() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }
      setChecking(false);
    }
    checkUser();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Le profil peut être absent (trigger raté) : on le crée au besoin
    const { data: profilExistant } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const { error } = profilExistant
      ? await supabase.from("profiles").update({ pseudo }).eq("id", user.id)
      : await supabase.from("profiles").insert({ id: user.id, pseudo });

    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        setMessage("Ce pseudo est déjà pris, choisis-en un autre.");
      } else {
        setMessage(`Erreur : ${error.message}`);
      }
    } else {
      router.push("/");
      router.refresh();
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <LoaderCentered />
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-73px)] flex items-center justify-center overflow-hidden px-6">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md p-8 rounded-xl glass-panel glow-focus shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-4xl text-primary tracking-tight mb-3">
            TiVoi
          </h1>
          <h2 className="font-display font-semibold text-xl text-on-surface mb-2">
            Choisissez votre pseudo
          </h2>
          <p className="text-on-surface-variant">
            C&apos;est ainsi que vous apparaîtrez dans la communauté.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="relative rounded-lg glow-focus transition-all">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-title font-semibold">
                @
              </span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Lettres, chiffres et underscore uniquement"
                autoComplete="off"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="votre_pseudo"
                className="w-full bg-surface-variant/50 border-0 border-b-2 border-outline-variant text-on-surface pl-10 pr-4 py-3 outline-none focus:border-primary-container transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs text-on-surface-variant uppercase tracking-[0.05em] font-title font-semibold">
              Suggestions
            </span>
            <div className="flex flex-wrap gap-2">
              {["cineaste_abidjan", "film_lover225", "golden_lens"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPseudo(s)}
                  className="font-title text-sm rounded-lg px-4 py-2 text-on-surface border border-outline-variant bg-transparent hover:border-primary-container hover:bg-primary-container/10 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary font-title font-semibold text-sm py-4 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={16} />}
            {loading ? "Validation..." : "Continuer"}
          </button>

          {message && (
            <p className="text-sm text-center text-on-surface-variant">
              {message}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
