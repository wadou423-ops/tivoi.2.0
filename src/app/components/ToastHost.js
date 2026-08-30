"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const { message, type } = e.detail || {};
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3800);
    }
    window.addEventListener("tivoi-toast", onToast);
    return () => window.removeEventListener("tivoi-toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in glass-panel rounded-lg px-5 py-3 flex items-center gap-2.5 shadow-xl"
        >
          {t.type === "success" ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : t.type === "error" ? (
            <XCircle size={16} className="text-error shrink-0" />
          ) : (
            <Info size={16} className="text-primary shrink-0" />
          )}
          <span className="text-sm text-on-surface">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
